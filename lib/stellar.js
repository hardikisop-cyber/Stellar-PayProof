import {
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Networks,
  Operation,
  StrKey,
  TransactionBuilder,
} from "stellar-sdk";
import {
  getAddress,
  requestAccess,
  signTransaction,
} from "@stellar/freighter-api";

export const STELLAR_HORIZON_URL =
  process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ||
  "https://horizon-testnet.stellar.org";

export const STELLAR_NETWORK_PASSPHRASE =
  process.env.NEXT_PUBLIC_STELLAR_NETWORK_PASSPHRASE || Networks.TESTNET;

export const STELLAR_EXPLORER_BASE =
  process.env.NEXT_PUBLIC_STELLAR_EXPLORER_BASE ||
  "https://stellar.expert/explorer/testnet";

const server = new Horizon.Server(STELLAR_HORIZON_URL);

function normalizeResult(result) {
  if (!result) {
    return { value: null, error: "Unknown wallet response" };
  }

  if (typeof result === "string") {
    return { value: result, error: null };
  }

  if (result.error) {
    return { value: null, error: result.error };
  }

  if (result.address) {
    return { value: result.address, error: null };
  }

  if (result.publicKey) {
    return { value: result.publicKey, error: null };
  }

  if (result.signedTxXdr) {
    return { value: result.signedTxXdr, error: null };
  }

  return { value: null, error: "Unexpected wallet response" };
}

function toMemoText(note) {
  if (!note) {
    return "";
  }

  return String(note).slice(0, 28);
}

export function isValidStellarAddress(address) {
  return StrKey.isValidEd25519PublicKey(address || "");
}

export function amountToStroops(amount) {
  const parsed = Number(amount);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error("Amount must be a positive number");
  }

  const stroops = Math.round(parsed * 1e7);
  if (stroops <= 0) {
    throw new Error("Amount is too small");
  }

  return stroops.toString();
}

export function shortAddress(address) {
  if (!address || address.length < 12) {
    return address || "";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function txExplorerUrl(hash) {
  return `${STELLAR_EXPLORER_BASE}/tx/${hash}`;
}

export function accountExplorerUrl(address) {
  return `${STELLAR_EXPLORER_BASE}/account/${address}`;
}

export function ledgerExplorerUrl(ledger) {
  return `${STELLAR_EXPLORER_BASE}/ledger/${ledger}`;
}

export async function connectFreighterWallet() {
  const connected = normalizeResult(await requestAccess());
  if (connected.error) {
    throw new Error(`Freighter access denied: ${connected.error}`);
  }

  const addressResult = normalizeResult(await getAddress());
  if (addressResult.error || !addressResult.value) {
    throw new Error(
      `Could not get wallet address: ${addressResult.error || "unknown error"}`,
    );
  }

  return addressResult.value;
}

async function signAndSubmit(transaction) {
  const signed = normalizeResult(
    await signTransaction(transaction.toXDR(), {
      networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
    }),
  );

  if (signed.error || !signed.value) {
    throw new Error(
      `Transaction signature failed: ${signed.error || "unknown error"}`,
    );
  }

  const signedTx = TransactionBuilder.fromXDR(
    signed.value,
    STELLAR_NETWORK_PASSPHRASE,
  );

  return server.submitTransaction(signedTx);
}

export async function sendSinglePayment({
  fromAddress,
  toAddress,
  amountXlm,
  note,
}) {
  const source = await server.loadAccount(fromAddress);
  const txBuilder = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  }).addOperation(
    Operation.payment({
      destination: toAddress,
      asset: Asset.native(),
      amount: (Number(amountToStroops(amountXlm)) / 1e7).toFixed(7),
    }),
  );

  const memoText = toMemoText(note);
  if (memoText) {
    txBuilder.addMemo(Memo.text(memoText));
  }

  const tx = txBuilder.setTimeout(180).build();
  const result = await signAndSubmit(tx);

  return {
    hash: result.hash,
    ledger: result.ledger,
  };
}

export async function sendBatchPayment({ fromAddress, recipients, note }) {
  if (!Array.isArray(recipients) || recipients.length === 0) {
    throw new Error("No recipients provided");
  }

  const source = await server.loadAccount(fromAddress);
  const txBuilder = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: STELLAR_NETWORK_PASSPHRASE,
  });

  recipients.forEach((recipient) => {
    txBuilder.addOperation(
      Operation.payment({
        destination: recipient.address,
        asset: Asset.native(),
        amount: (Number(amountToStroops(recipient.amountXlm)) / 1e7).toFixed(7),
      }),
    );
  });

  const memoText = toMemoText(note);
  if (memoText) {
    txBuilder.addMemo(Memo.text(memoText));
  }

  const tx = txBuilder.setTimeout(180).build();
  const result = await signAndSubmit(tx);

  return {
    hash: result.hash,
    ledger: result.ledger,
  };
}

async function loadMemoMap(records) {
  const uniqueHashes = [
    ...new Set(records.map((record) => record.transaction_hash)),
  ];
  const memoMap = {};

  await Promise.all(
    uniqueHashes.map(async (hash) => {
      try {
        const tx = await server.transactions().transaction(hash).call();
        memoMap[hash] = tx.memo || "";
      } catch {
        memoMap[hash] = "";
      }
    }),
  );

  return memoMap;
}

export async function fetchIncomingPayments(address, limit = 50) {
  const response = await server
    .payments()
    .forAccount(address)
    .order("desc")
    .limit(limit)
    .call();

  const records = (response.records || []).filter(
    (record) =>
      record.type === "payment" &&
      record.asset_type === "native" &&
      record.to === address,
  );

  const memoMap = await loadMemoMap(records);

  return records.map((record) => ({
    hash: record.transaction_hash,
    ledger: record.ledger_attr || record.ledger,
    from: record.from,
    to: record.to,
    amountXlm: Number(record.amount),
    amountRaw: String(Math.round(Number(record.amount) * 1e7)),
    timestampMs: new Date(record.created_at).getTime(),
    timestamp: Math.floor(new Date(record.created_at).getTime() / 1000),
    note: memoMap[record.transaction_hash] || "",
  }));
}

export function buildPaymentSummary(payments) {
  if (!payments || payments.length === 0) {
    return {
      totalAmountXlm: "0.0000000",
      paymentCount: 0,
      earliestDate: "N/A",
      latestDate: "N/A",
    };
  }

  const sorted = [...payments].sort((a, b) => a.timestampMs - b.timestampMs);
  const total = payments.reduce((sum, payment) => sum + payment.amountXlm, 0);

  return {
    totalAmountXlm: total.toFixed(7),
    paymentCount: payments.length,
    earliestDate: new Date(sorted[0].timestampMs).toLocaleDateString(),
    latestDate: new Date(
      sorted[sorted.length - 1].timestampMs,
    ).toLocaleDateString(),
  };
}
