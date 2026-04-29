import {
  BASE_FEE,
  Keypair,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  xdr,
} from "stellar-sdk";
import { SorobanRpc } from "stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";

export const SOROBAN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID || "";

export const STELLAR_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

const rpc = new SorobanRpc.Server(SOROBAN_RPC_URL);

// Helper to convert Stellar address to contract Address ScVal
function addressToScVal(address) {
  if (!StrKey.isValidEd25519PublicKey(address)) {
    throw new Error(`Invalid Stellar address: ${address}`);
  }
  return nativeToScVal(address, { type: "address" });
}

// Helper to convert number to i128 ScVal
function numberToI128ScVal(amount) {
  const i128 = new xdr.ScVal.ScValTypeI128(
    new xdr.Int128Parts({
      hi: xdr.Int64.fromString(
        Math.floor(amount / Math.pow(2, 64)).toString()
      ),
      lo: xdr.Uint64.fromString((amount % Math.pow(2, 64)).toString()),
    })
  );
  return xdr.ScVal.scValTypeI128(i128);
}

// Helper to convert string to ScVal
function stringToScVal(str) {
  return nativeToScVal(str, { type: "string" });
}

/**
 * Record a single payment on-chain via Soroban contract
 * @param {string} employerAddress - Freighter wallet address (must sign)
 * @param {string} employeeAddress - Recipient address
 * @param {string} amountXlm - Amount in XLM (e.g., "10.5")
 * @param {string} note - Payment memo/note
 * @returns {Promise<{hash: string, status: string}>}
 */
export async function recordPaymentOnChain({
  employerAddress,
  employeeAddress,
  amountXlm,
  note,
}) {
  if (!SOROBAN_CONTRACT_ID) {
    throw new Error("SOROBAN_CONTRACT_ID not configured");
  }

  if (!StrKey.isValidEd25519PublicKey(employerAddress)) {
    throw new Error("Invalid employer address");
  }

  if (!StrKey.isValidEd25519PublicKey(employeeAddress)) {
    throw new Error("Invalid employee address");
  }

  // Convert amount to stroops (i128)
  const stroops = Math.round(parseFloat(amountXlm) * 1e7);
  if (stroops <= 0) {
    throw new Error("Amount must be positive");
  }

  try {
    // Get the source account
    const account = await rpc.getAccount(employerAddress);

    // Build contract invocation operation
    const txBuilder = new TransactionBuilder(account, {
      fee: BASE_FEE,
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    });

    const invokeHostFunctionOp = Operation.invokeContractFunction({
      contract: SOROBAN_CONTRACT_ID,
      method: "record_payment",
      args: [
        nativeToScVal(employerAddress, { type: "address" }),
        nativeToScVal(employeeAddress, { type: "address" }),
        nativeToScVal(stroops, { type: "i128" }),
        nativeToScVal(note || "", { type: "string" }),
      ],
    });

    const tx = txBuilder.addOperation(invokeHostFunctionOp).setTimeout(300).build();

    // Sign with Freighter
    const signed = await signTransaction(tx.toXDR(), {
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    });

    if (!signed || !signed.signedTxXdr) {
      throw new Error("Transaction signature failed");
    }

    const signedTx = TransactionBuilder.fromXDR(
      signed.signedTxXdr,
      STELLAR_NETWORK_PASSPHRASE
    );

    // Submit to Soroban RPC
    const result = await rpc.sendTransaction(signedTx);

    // Poll for transaction completion
    let finalResult = result;
    let attempts = 0;
    while (
      finalResult.status === "PENDING" &&
      attempts < 20
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      finalResult = await rpc.getTransaction(result.hash);
      attempts++;
    }

    if (finalResult.status === "FAILED") {
      throw new Error(
        `Transaction failed: ${finalResult.resultXdr || "unknown error"}`
      );
    }

    return {
      hash: result.hash,
      status: finalResult.status,
    };
  } catch (error) {
    console.error("Error recording payment on-chain:", error);
    throw error;
  }
}

/**
 * Fetch employer reputation score from contract
 * @param {string} employerAddress - Employer address to check
 * @returns {Promise<{score: number, paymentCount: number, totalAmount: string, lastPaymentTimestamp: number}>}
 */
export async function getEmployerReputation(employerAddress) {
  if (!SOROBAN_CONTRACT_ID) {
    throw new Error("SOROBAN_CONTRACT_ID not configured");
  }

  if (!StrKey.isValidEd25519PublicKey(employerAddress)) {
    throw new Error("Invalid employer address");
  }

  try {
    const result = await rpc.simulateTransaction(
      new TransactionBuilder(await rpc.getAccount(employerAddress), {
        fee: BASE_FEE,
        networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
      })
        .addOperation(
          Operation.invokeContractFunction({
            contract: SOROBAN_CONTRACT_ID,
            method: "get_reputation",
            args: [nativeToScVal(employerAddress, { type: "address" })],
          })
        )
        .setTimeout(300)
        .build()
    );

    if (
      result.error ||
      !result.results ||
      result.results.length === 0
    ) {
      return {
        score: 0,
        paymentCount: 0,
        totalAmount: "0",
        lastPaymentTimestamp: 0,
      };
    }

    const resultXdr = result.results[0].result.retVal;
    const scoreStruct = resultXdr.map.val();

    // Parse CredibilityScore struct from XDR
    const scoreMap = {};
    scoreStruct.forEach((item) => {
      const key = item.key.sym().toString();
      const val = item.val;
      
      if (key === "score") {
        scoreMap.score = parseInt(val.u32().toString());
      } else if (key === "payment_count") {
        scoreMap.paymentCount = parseInt(val.u32().toString());
      } else if (key === "total_amount") {
        scoreMap.totalAmount = val.i128().toString();
      } else if (key === "last_payment_timestamp") {
        scoreMap.lastPaymentTimestamp = parseInt(val.u64().toString());
      }
    });

    return {
      score: scoreMap.score || 0,
      paymentCount: scoreMap.paymentCount || 0,
      totalAmount: scoreMap.totalAmount || "0",
      lastPaymentTimestamp: scoreMap.lastPaymentTimestamp || 0,
    };
  } catch (error) {
    console.error("Error fetching reputation:", error);
    // Return default values on error
    return {
      score: 0,
      paymentCount: 0,
      totalAmount: "0",
      lastPaymentTimestamp: 0,
    };
  }
}

/**
 * Get reputation badge text based on score
 */
export function getReputationBadge(score) {
  if (score >= 90) return "⭐ Elite Employer";
  if (score >= 75) return "✅ Verified Employer";
  if (score >= 50) return "🤝 Trusted Employer";
  if (score >= 25) return "📋 Registered Employer";
  if (score > 0) return "🆕 New Employer";
  return "❌ No Reputation Data";
}

/**
 * Check if contract is available and configured
 */
export function isSorobanConfigured() {
  return !!SOROBAN_CONTRACT_ID && !!SOROBAN_RPC_URL;
}
