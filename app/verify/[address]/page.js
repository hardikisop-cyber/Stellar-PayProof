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
  fetchEmployerReputations,
} from "@/lib/stellar";
import { getReputationBadge } from "@/lib/soroban";

export default function VerifyPage() {
  const params = useParams();
  const address = params?.address || "";

  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [reputations, setReputations] = useState({});

  const reputationValues = Object.values(reputations).filter(
    (item) => item && item.score > 0,
  );
  const topReputation = reputationValues.reduce(
    (best, item) => (item.score > best.score ? item : best),
    { score: 0, paymentCount: 0, totalAmount: "0", lastPaymentTimestamp: 0 },
  );
  const averageReputation = reputationValues.length
    ? Math.round(
        reputationValues.reduce((sum, item) => sum + item.score, 0) /
          reputationValues.length,
      )
    : 0;

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

        // Fetch employer reputations
        try {
          const reps = await fetchEmployerReputations(paymentHistory);
          setReputations(reps);
        } catch (repError) {
          console.warn("Failed to fetch reputations:", repError);
        }
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
        <div
          className="card"
          style={{ textAlign: "center", marginTop: "40px" }}
        >
          <p>Loading Stellar payment proof...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: "40px" }}>
          <div
            style={{ textAlign: "center", padding: "40px", color: "#ff6b6b" }}
          >
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
          <div
            className="badge badge-green"
            style={{ fontSize: "18px", padding: "8px 16px" }}
          >
            Verified on Stellar Testnet
          </div>
          <p
            style={{
              marginTop: "16px",
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
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
          <p
            style={{
              fontSize: "11px",
              color: "var(--muted)",
              marginBottom: "6px",
            }}
          >
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
          <a
            href={accountExplorerUrl(address)}
            target="_blank"
            rel="noopener noreferrer"
            className="link"
          >
            Open Account in Explorer
          </a>
        </div>

        <div className="passport-panel">
          <div>
            <div className="eyebrow">Income Passport</div>
            <h3 style={{ marginTop: "6px" }}>
              Verification beyond a payment list
            </h3>
            <p style={{ marginTop: "8px", color: "var(--muted)", fontSize: "13px" }}>
              PayProof turns ledger history into a reputation profile that is
              easier to understand and harder to fake.
            </p>
          </div>

          <div className="passport-stats">
            <div className="passport-stat">
              <span>Top employer score</span>
              <strong>{topReputation.score}/100</strong>
              <small>{getReputationBadge(topReputation.score)}</small>
            </div>
            <div className="passport-stat">
              <span>Average score</span>
              <strong>{averageReputation}/100</strong>
              <small>Across all paying employers</small>
            </div>
            <div className="passport-stat">
              <span>Unique employers</span>
              <strong>{reputationValues.length}</strong>
              <small>Tracked in this passport</small>
            </div>
          </div>
        </div>

        {summary && (
          <div className="summary-box">
            <div className="summary-item">
              <div className="summary-item-label">Total Received</div>
              <div className="summary-item-value">
                {summary.totalAmountXlm} XLM
              </div>
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

        <h3 style={{ marginTop: "32px", marginBottom: "16px" }}>
          Incoming Payments
        </h3>
        <div className="table-shell">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount (XLM)</th>
                <th>From</th>
                <th>Employer Reputation</th>
                <th>Ledger</th>
                <th>Memo</th>
              </tr>
            </thead>
            <tbody>
              {history.map((payment, index) => {
                const rep = reputations[payment.from] || {};
                return (
                  <tr key={`${payment.hash}-${index}`}>
                    <td>{new Date(payment.timestampMs).toLocaleString()}</td>
                    <td>{payment.amountXlm.toFixed(7)}</td>
                    <td>{shortAddress(payment.from)}</td>
                    <td>
                      <div style={{ fontSize: "12px" }}>
                        <div>{getReputationBadge(rep.score || 0)}</div>
                        {rep.score > 0 && (
                          <div style={{ marginTop: "4px", color: "var(--muted)" }}>
                            Score: {rep.score}/100
                          </div>
                        )}
                      </div>
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>

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
          <p>
            Powered by Stellar Testnet - Public, verifiable and transparent.
          </p>
          <p style={{ marginTop: "8px" }}>payproof.xyz</p>
        </div>
      </div>
    </div>
  );
}
