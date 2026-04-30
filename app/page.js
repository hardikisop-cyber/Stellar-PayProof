"use client";

import { useMemo, useState } from "react";
import { generateCertificate } from "@/lib/certificate";
import {
  buildPaymentSummary,
  connectFreighterWallet,
  fetchIncomingPayments,
  isValidStellarAddress,
  ledgerExplorerUrl,
  sendBatchPayment,
  sendSinglePayment,
  shortAddress,
  txExplorerUrl,
} from "@/lib/stellar";

function parseBatchAddresses(input) {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export default function PayProofApp() {
  const passportConfigured = !!process.env.NEXT_PUBLIC_PASSPORT_CONTRACT_ID;

  const [activeTab, setActiveTab] = useState("single");
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [employeeAddr, setEmployeeAddr] = useState("");
  const [amount, setAmount] = useState("1");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [txHash, setTxHash] = useState("");
  const [payments, setPayments] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const [batchAddressesText, setBatchAddressesText] = useState("");
  const [batchAmount, setBatchAmount] = useState("0.1");
  const [batchNote, setBatchNote] = useState("PayProof batch payout");
  const [batchStatus, setBatchStatus] = useState("");
  const [batchStatusType, setBatchStatusType] = useState("");
  const [batchResult, setBatchResult] = useState(null);

  const parsedBatchAddresses = useMemo(
    () => parseBatchAddresses(batchAddressesText),
    [batchAddressesText],
  );

  const connectWallet = async () => {
    try {
      const wallet = await connectFreighterWallet();
      setWalletAddress(wallet);
      setConnected(true);
      setStatus("Freighter connected on Stellar testnet");
      setStatusType("success");
    } catch (error) {
      setStatus(error.message || "Could not connect Freighter wallet");
      setStatusType("error");
    }
  };

  const refreshEmployeeHistory = async (address) => {
    const history = await fetchIncomingPayments(address, 30);
    setPayments(history);
    return history;
  };

  const handlePayEmployee = async () => {
    if (!connected) {
      setStatus("Connect Freighter first");
      setStatusType("error");
      return;
    }

    if (!employeeAddr || !amount) {
      setStatus("Please fill in employee address and amount");
      setStatusType("error");
      return;
    }

    if (!isValidStellarAddress(employeeAddr)) {
      setStatus("Invalid Stellar address");
      setStatusType("error");
      return;
    }

    setIsProcessing(true);
    setStatus("Submitting payment to Stellar testnet...");
    setStatusType("info");

    try {
      const result = await sendSinglePayment({
        fromAddress: walletAddress,
        toAddress: employeeAddr,
        amountXlm: amount,
        note,
      });

      setTxHash(result.hash);
      setStatus("Payment confirmed on Stellar testnet");
      setStatusType("success");

      const history = await refreshEmployeeHistory(employeeAddr);
      if (history.length > 0) {
        const summary = buildPaymentSummary(history);
        const certificateData = {
          employeeName: note || shortAddress(employeeAddr),
          employeeAddress: employeeAddr,
          totalAmountXlm: summary.totalAmountXlm,
          paymentCount: summary.paymentCount,
          fromDate: summary.earliestDate,
          toDate: summary.latestDate,
          payments: history.map((payment) => ({
            amountXlm: payment.amountXlm.toFixed(7),
            timestamp: payment.timestamp,
            ledger: payment.ledger,
            employer: payment.from,
            note: payment.note,
          })),
        };

        await generateCertificate(certificateData);
      }
    } catch (error) {
      setStatus(error.message || "Payment failed");
      setStatusType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchPay = async () => {
    if (!connected) {
      setBatchStatus("Connect Freighter first");
      setBatchStatusType("error");
      return;
    }

    if (parsedBatchAddresses.length === 0) {
      setBatchStatus("Add at least one recipient address");
      setBatchStatusType("error");
      return;
    }

    const invalidAddress = parsedBatchAddresses.find(
      (address) => !isValidStellarAddress(address),
    );

    if (invalidAddress) {
      setBatchStatus(`Invalid Stellar address in list: ${invalidAddress}`);
      setBatchStatusType("error");
      return;
    }

    setIsProcessing(true);
    setBatchStatus("Submitting multi-operation batch payment...");
    setBatchStatusType("info");

    try {
      const startedAt = Date.now();
      const recipients = parsedBatchAddresses.map((address) => ({
        address,
        amountXlm: batchAmount,
      }));

      const result = await sendBatchPayment({
        fromAddress: walletAddress,
        recipients,
        note: batchNote,
      });

      const elapsedMs = Date.now() - startedAt;
      setBatchResult({
        count: recipients.length,
        amountEach: batchAmount,
        total: (Number(batchAmount) * recipients.length).toFixed(7),
        ledger: result.ledger,
        hash: result.hash,
        elapsedMs,
      });
      setBatchStatus("Batch payment confirmed");
      setBatchStatusType("success");
    } catch (error) {
      setBatchResult(null);
      setBatchStatus(error.message || "Batch payment failed");
      setBatchStatusType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>PayProof</h1>
          <p style={{ fontSize: "12px", color: "var(--muted)" }}>
            Blockchain income verification on Stellar Testnet
          </p>
        </div>
        <div className="header-right">
          {connected ? (
            <div className="wallet-badge">
              Connected: {shortAddress(walletAddress)}
            </div>
          ) : (
            <button className="btn" onClick={connectWallet}>
              Connect Freighter
            </button>
          )}
        </div>
      </div>

      <div className="hero-panel">
        <div>
          <div className="eyebrow">Level 4 Ready</div>
          <h2 className="hero-title">Turn payroll into a trust signal.</h2>
          <p className="hero-text">
            PayProof records payments, builds reputation, and turns a simple
            payout into a shareable income passport on Stellar.
          </p>
        </div>

        <div className="hero-cards">
          <div className="mini-card">
            <strong>On-chain proof</strong>
            <span>Soroban-backed verification</span>
          </div>
          <div className="mini-card">
            <strong>Credibility scores</strong>
            <span>Employer trust grows with consistency</span>
          </div>
          <div className="mini-card">
            <strong>Mobile-ready flow</strong>
            <span>Responsive cards, tabs, and tables</span>
          </div>
          <div className="mini-card">
            <strong>Level 5 inter-contract</strong>
            <span>
              Passport contract{" "}
              {passportConfigured ? "configured" : "not configured yet"}
            </span>
          </div>
        </div>
      </div>

      {status && (
        <div className={`status-message status-${statusType}`}>
          {status}
          {txHash && (
            <>
              {" "}
              <a
                href={txExplorerUrl(txHash)}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                View Transaction
              </a>
            </>
          )}
        </div>
      )}

      <div className="tab-container">
        <button
          className={`tab-button ${activeTab === "single" ? "active" : ""}`}
          onClick={() => setActiveTab("single")}
        >
          Single Payment
        </button>
        <button
          className={`tab-button ${activeTab === "batch" ? "active" : ""}`}
          onClick={() => setActiveTab("batch")}
        >
          Batch Payment
        </button>
      </div>

      {activeTab === "single" && (
        <div className="card">
          <h2 style={{ marginBottom: "20px" }}>Pay Single Employee</h2>

          <div className="form-group">
            <label>Employee Stellar Address</label>
            <input
              type="text"
              className="input"
              placeholder="G..."
              value={employeeAddr}
              onChange={(event) => setEmployeeAddr(event.target.value.trim())}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount (XLM)</label>
              <input
                type="number"
                className="input"
                placeholder="1"
                step="0.0000001"
                min="0"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Payment Note</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., April salary"
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>

          <button
            className="btn"
            onClick={handlePayEmployee}
            disabled={!connected || isProcessing}
            style={{ width: "100%", marginTop: "16px" }}
          >
            {isProcessing ? "Processing..." : "Send Payment + Generate PDF"}
          </button>

          {payments.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h3 style={{ marginBottom: "12px" }}>
                Incoming History for Recipient
              </h3>
              <div className="table-shell">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount (XLM)</th>
                      <th>From</th>
                      <th>Ledger</th>
                      <th>Memo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {payments.slice(0, 20).map((payment, index) => (
                      <tr key={`${payment.hash}-${index}`}>
                        <td>
                          {new Date(payment.timestampMs).toLocaleString()}
                        </td>
                        <td>{payment.amountXlm.toFixed(7)}</td>
                        <td>{shortAddress(payment.from)}</td>
                        <td>
                          <a
                            href={ledgerExplorerUrl(payment.ledger)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="link"
                          >
                            {payment.ledger}
                          </a>
                        </td>
                        <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                          {payment.note || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === "batch" && (
        <div className="grid-2">
          <div className="card">
            <h2 style={{ marginBottom: "20px" }}>Batch Payroll</h2>
            <p
              style={{
                fontSize: "12px",
                color: "var(--muted)",
                marginBottom: "16px",
              }}
            >
              Submit one Stellar transaction with multiple payment operations.
              Each line below must be a funded Stellar testnet account.
            </p>

            <div className="form-group">
              <label>Recipient Addresses (one per line)</label>
              <textarea
                className="input"
                rows={8}
                placeholder="G...\nG...\nG..."
                value={batchAddressesText}
                onChange={(event) => setBatchAddressesText(event.target.value)}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Amount Per Address (XLM)</label>
                <input
                  type="number"
                  className="input"
                  min="0"
                  step="0.0000001"
                  value={batchAmount}
                  onChange={(event) => setBatchAmount(event.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Batch Memo</label>
                <input
                  type="text"
                  className="input"
                  value={batchNote}
                  onChange={(event) => setBatchNote(event.target.value)}
                />
              </div>
            </div>

            <button
              className="btn"
              onClick={handleBatchPay}
              disabled={!connected || isProcessing}
              style={{ width: "100%", marginTop: "16px" }}
            >
              {isProcessing ? "Processing..." : "Run Batch Payment"}
            </button>

            {batchStatus && (
              <div
                className={`status-message status-${batchStatusType}`}
                style={{ marginTop: "16px" }}
              >
                {batchStatus}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: "16px" }}>Batch Summary</h3>
            <div className="summary-box">
              <div className="summary-item">
                <div className="summary-item-label">Recipients</div>
                <div className="summary-item-value">
                  {parsedBatchAddresses.length}
                </div>
              </div>
              <div className="summary-item">
                <div className="summary-item-label">Amount Each</div>
                <div className="summary-item-value">
                  {batchAmount || "0"} XLM
                </div>
              </div>
            </div>

            {batchResult ? (
              <div>
                <p style={{ fontSize: "13px", marginBottom: "10px" }}>
                  Batch confirmed in {(batchResult.elapsedMs / 1000).toFixed(2)}
                  s.
                </p>
                <p style={{ fontSize: "13px", marginBottom: "10px" }}>
                  Total sent: {batchResult.total} XLM
                </p>
                <p style={{ fontSize: "13px", marginBottom: "10px" }}>
                  Ledger:{" "}
                  <a
                    href={ledgerExplorerUrl(batchResult.ledger)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    {batchResult.ledger}
                  </a>
                </p>
                <p style={{ fontSize: "13px" }}>
                  Transaction:{" "}
                  <a
                    href={txExplorerUrl(batchResult.hash)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    {shortAddress(batchResult.hash)}
                  </a>
                </p>
              </div>
            ) : (
              <p style={{ color: "var(--muted)", fontSize: "12px" }}>
                No batch submitted yet.
              </p>
            )}

            <div style={{ marginTop: "20px" }}>
              <div
                className="badge badge-purple"
                style={{ marginBottom: "12px" }}
              >
                Level 5 concept: Income Passport
              </div>
              <p style={{ fontSize: "12px", color: "var(--muted)" }}>
                Verified payments become a portable reputation profile instead
                of just a transaction list.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
