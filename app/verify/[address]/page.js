"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { generateCertificate } from "@/lib/certificate";
import {
  accountExplorerUrl,
  buildPaymentSummary,
  fetchIncomingPayments,
  isValidStellarAddress,
  ledgerExplorerUrl,
  shortAddress,
} from "@/lib/stellar";

export default function VerifyPage() {
  const params = useParams();
  const address = params?.address || "";

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!address || !isValidStellarAddress(address)) {
          setError("Invalid Stellar address format");
          return;
        }

        const paymentHistory = await fetchIncomingPayments(address, 50);
        if (paymentHistory.length === 0) {
          setError("No incoming XLM payment history found for this address");
          return;
        }

        setHistory(paymentHistory);
        setSummary(buildPaymentSummary(paymentHistory));
      } catch (loadError) {
        setError(loadError.message || "Failed to load payment history");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [address]);

  const handleGenerateCertificate = async () => {
    if (!summary || history.length === 0) {
      return;
    }

    const certificateData = {
      employeeName: shortAddress(address),
      employeeAddress: address,
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
  };

  if (loading) {
    return (
      <div className="container">
        <div className="card" style={{ textAlign: "center", marginTop: "40px" }}>
          <p>Loading Stellar payment proof...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: "40px" }}>
          <div style={{ textAlign: "center", padding: "40px", color: "#ff6b6b" }}>
            <h2 style={{ marginBottom: "16px" }}>Verification Not Found</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="header">
        <div>
          <h1>PayProof Income Verification</h1>
        </div>
      </div>

      <div className="card">
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div className="badge badge-green" style={{ fontSize: "18px", padding: "8px 16px" }}>
            Verified on Stellar Testnet
          </div>
          <p style={{ marginTop: "16px", fontSize: "14px", color: "var(--muted)" }}>
            This income proof is verifiable using public Stellar ledger data.
          </p>
        </div>

        <div
          style={{
            background: "rgba(108, 71, 255, 0.1)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "16px",
            marginBottom: "24px",
          }}
        >
          <p style={{ fontSize: "11px", color: "var(--muted)", marginBottom: "6px" }}>
            Verified Wallet Address
          </p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              color: "var(--purple)",
              wordBreak: "break-all",
              marginBottom: "8px",
            }}
          >
            {address}
          </p>
          <a href={accountExplorerUrl(address)} target="_blank" rel="noopener noreferrer" className="link">
            Open Account in Explorer
          </a>
        </div>

        {summary && (
          <div className="summary-box">
            <div className="summary-item">
              <div className="summary-item-label">Total Received</div>
              <div className="summary-item-value">{summary.totalAmountXlm} XLM</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">Payment Count</div>
              <div className="summary-item-value">{summary.paymentCount}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">First Payment</div>
              <div className="summary-item-value" style={{ fontSize: "12px" }}>
                {summary.earliestDate}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">Latest Payment</div>
              <div className="summary-item-value" style={{ fontSize: "12px" }}>
                {summary.latestDate}
              </div>
            </div>
          </div>
        )}

        <h3 style={{ marginTop: "32px", marginBottom: "16px" }}>Incoming Payments</h3>
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
            {history.map((payment, index) => (
              <tr key={`${payment.hash}-${index}`}>
                <td>{new Date(payment.timestampMs).toLocaleString()}</td>
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

        <button
          className="btn"
          onClick={handleGenerateCertificate}
          style={{ width: "100%", marginTop: "24px" }}
        >
          Download Certificate PDF
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: "32px",
            paddingTop: "24px",
            borderTop: "1px solid var(--border)",
            fontSize: "12px",
            color: "var(--muted)",
          }}
        >
          <p>Powered by Stellar Testnet - Public, verifiable and transparent.</p>
          <p style={{ marginTop: "8px" }}>payproof.xyz</p>
        </div>
      </div>
    </div>
  );
}
