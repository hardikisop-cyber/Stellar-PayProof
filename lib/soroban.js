import {
  BASE_FEE,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
  nativeToScVal,
  scValToNative,
  rpc,
} from "stellar-sdk";
import { signTransaction } from "@stellar/freighter-api";

export const SOROBAN_RPC_URL =
  process.env.NEXT_PUBLIC_SOROBAN_RPC_URL ||
  "https://soroban-testnet.stellar.org";

export const SOROBAN_CONTRACT_ID =
  process.env.NEXT_PUBLIC_SOROBAN_CONTRACT_ID || "";

export const STELLAR_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

let sorobanRpcClient;

function getSorobanRpcClient() {
  if (sorobanRpcClient) {
    return sorobanRpcClient;
  }

  if (!rpc || !rpc.Server) {
    throw new Error("Soroban RPC client is not available in the installed stellar-sdk version");
  }

  sorobanRpcClient = new rpc.Server(SOROBAN_RPC_URL);
  return sorobanRpcClient;
}

function normalizeSignedXdr(signedResult) {
  if (!signedResult) {
    return null;
  }

  if (typeof signedResult === "string") {
    return signedResult;
  }

  if (signedResult.signedTxXdr) {
    return signedResult.signedTxXdr;
  }

  if (signedResult.signedXDR) {
    return signedResult.signedXDR;
  }

  return null;
}

function extractSimulationReturn(simulation) {
  if (!simulation || !simulation.results || simulation.results.length === 0) {
    return null;
  }

  const firstResult = simulation.results[0];
  return firstResult?.result?.retVal || firstResult?.xdr || null;
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
    const rpc = getSorobanRpcClient();
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

    const signedTxXdr = normalizeSignedXdr(signed);
    if (!signedTxXdr) {
      throw new Error("Transaction signature failed");
    }

    const signedTx = TransactionBuilder.fromXDR(
      signedTxXdr,
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
    const rpc = getSorobanRpcClient();

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

    if (result.error) {
      return {
        score: 0,
        paymentCount: 0,
        totalAmount: "0",
        lastPaymentTimestamp: 0,
      };
    }

    const retVal = extractSimulationReturn(result);
    if (!retVal) {
      return {
        score: 0,
        paymentCount: 0,
        totalAmount: "0",
        lastPaymentTimestamp: 0,
      };
    }

    const parsed = scValToNative(retVal);

    return {
      score: Number(parsed?.score || 0),
      paymentCount: Number(parsed?.payment_count || parsed?.paymentCount || 0),
      totalAmount: String(parsed?.total_amount || parsed?.totalAmount || "0"),
      lastPaymentTimestamp: Number(
        parsed?.last_payment_timestamp || parsed?.lastPaymentTimestamp || 0,
      ),
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
