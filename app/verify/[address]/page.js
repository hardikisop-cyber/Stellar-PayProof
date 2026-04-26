"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { getReadContract } from "@/lib/contract";
import { generateCertificate } from "@/lib/certificate";

export default function VerifyPage({ params }) {
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState([]);
  const [rawHistory, setRawHistory] = useState([]);
  const [summary, setSummary] = useState(null);
  const [error, setError] = useState("");
  const [address, setAddress] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const resolvedAddress = await params;
        const addr = resolvedAddress.address;
        setAddress(addr);

        if (!ethers.isAddress(addr)) {
          setError("Invalid address format");
          setLoading(false);
          return;
        }

        const readContract = getReadContract();

        const paymentHistory = await readContract.getHistory(addr);
        
        if (paymentHistory.length === 0) {
          setError("No payment history found for this address");
          setLoading(false);
          return;
        }

        setRawHistory(paymentHistory);
          amount: ethers.formatEther(p.amount),
          timestamp: new Date(Number(p.timestamp) * 1000),
          blockNumber: p.blockNumber.toString(),
          note: p.note,
        }));

        setHistory(displayHistory);

        const fromTimestamp = 0;
        const summaryData = await readContract.getSummary(addr, fromTimestamp);

        setSummary({
          totalAmount: ethers.formatEther(summaryData.totalAmount),
          paymentCount: summaryData.paymentCount.toString(),
          earliestPayment:
            summaryData.earliestPayment > 0
              ? new Date(
                  Number(summaryData.earliestPayment) * 1000,
                ).toLocaleDateString()
              : "N/A",
          latestPayment:
            summaryData.latestPayment > 0
              ? new Date(
                  Number(summaryData.latestPayment) * 1000,
                ).toLocaleDateString()
              : "N/A",
        });
      } catch (err) {
        console.error("Error loading data:", err);
        setError(`Error loading data: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [params]);

  const handleGenerateCertificate = async () => {
    if (rawHistory.length === 0 || !summary) {
      return;
    }

    const earliestDate = new Date(Number(rawHistory[rawHistory.length - 1].timestamp) * 1000);
    const latestDate = new Date(Number(rawHistory[0].timestamp) * 1000);

    const totalReceivedWei = rawHistory.reduce((sum, p) => sum + p.amount, 0n);

    const certificateData = {
      employeeName: address.slice(0, 8),
      employeeAddress: address,
      totalAmountWei: totalReceivedWei.toString(),
      paymentCount: rawHistory.length,
      fromDate: earliestDate.toLocaleDateString(),
      toDate: latestDate.toLocaleDateString(),
      payments: rawHistory.map((p) => ({
        amount: p.amount,
        timestamp: p.timestamp,
        blockNumber: p.blockNumber,
        employer: p.employer,
        note: p.note,
      })),
      contractAddress: process.env.NEXT_PUBLIC_CONTRACT_ADDRESS,
    };

    try {
      await generateCertificate(certificateData);
    } catch (err) {
      console.error("Error generating certificate:", err);
    }
  };

  if (loading) {
    return (
      <div className="container">
        <div
          className="card"
          style={{ textAlign: "center", marginTop: "40px" }}
        >
          <p>Loading income verification...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="card" style={{ marginTop: "40px" }}>
          <div
            style={{
              textAlign: "center",
              padding: "40px",
              color: "#ff6b6b",
            }}
          >
            <h2 style={{ marginBottom: "16px" }}>⚠ Not Found</h2>
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
            ✓ VERIFIED
          </div>
          <p
            style={{
              marginTop: "16px",
              fontSize: "14px",
              color: "var(--muted)",
            }}
          >
            This income record is permanently stored on the Monad Blockchain
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
            Wallet Address
          </p>
          <p
            style={{
              fontFamily: "monospace",
              fontSize: "13px",
              color: "var(--purple)",
              wordBreak: "break-all",
            }}
          >
            {address}
          </p>
        </div>

        {summary && (
          <div className="summary-box">
            <div className="summary-item">
              <div className="summary-item-label">Total Received</div>
              <div className="summary-item-value">
                {summary.totalAmount} MON
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">Payment Count</div>
              <div className="summary-item-value">{summary.paymentCount}</div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">Active Since</div>
              <div className="summary-item-value" style={{ fontSize: "12px" }}>
                {summary.earliestPayment}
              </div>
            </div>
            <div className="summary-item">
              <div className="summary-item-label">Latest Payment</div>
              <div className="summary-item-value" style={{ fontSize: "12px" }}>
                {summary.latestPayment}
              </div>
            </div>
          </div>
        )}

        <h3 style={{ marginTop: "32px", marginBottom: "16px" }}>
          Payment History
        </h3>
        <table className="table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Amount (MON)</th>
              <th>From</th>
              <th>Block</th>
              <th>Note</th>
            </tr>
          </thead>
          <tbody>
            {history.map((p, idx) => (
              <tr key={idx}>
                <td>{p.timestamp.toLocaleString()}</td>
                <td>{p.amount}</td>
                <td>
                  {p.employer.slice(0, 6)}...{p.employer.slice(-4)}
                </td>
                <td>
                  <a
                    href={`https://testnet.monadexplorer.com/block/${p.blockNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link"
                  >
                    {p.blockNumber}
                  </a>
                </td>
                <td style={{ fontSize: "12px", color: "var(--muted)" }}>
                  {p.note || "—"}
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
          <p>Powered by Monad — Immutable. Trustless. Instant.</p>
          <p style={{ marginTop: "8px" }}>payproof.xyz</p>
        </div>
      </div>
    </div>
  );
}
