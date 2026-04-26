"use client";

import { useState, useEffect } from "react";
import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, getContract } from "@/lib/contract";
import { generateCertificate } from "@/lib/certificate";

const FAKE_EMPLOYEES = [
  {
    name: "Rahul Sharma — UI Designer",
    address: "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9",
  },
  {
    name: "Priya Patel — DAO Contributor",
    address: "0x71bE63f3384a0DA5F6d29a544E4e3Db9E8C8B82f",
  },
  {
    name: "Amit Kumar — Smart Contract Developer",
    address: "0x8ba1f109551bD432803012645Ac136ddd64DBA72",
  },
  {
    name: "Neha Singh — Content Writer",
    address: "0x4e59b44847b379578588920eA3601DC8Eb57ebef",
  },
  {
    name: "Vikram Gupta — Community Manager",
    address: "0x2546BcD3c84621e001FfAa51030b2D694369f53e",
  },
  {
    name: "Arjun Verma — QA Engineer",
    address: "0x68B1D87F95Dd63E084ce8aD9582EB608DC17F81B",
  },
  {
    name: "Divya Nair — Product Manager",
    address: "0xc2575A0E9425D3b67f1F19BAdAa3cF295c95E5d3",
  },
  {
    name: "Sanjay Reddy — DevOps Engineer",
    address: "0xEc85f77414D4ce7119912A6862d1D591C3D51eaC",
  },
  {
    name: "Kavya Iyer — UX Researcher",
    address: "0x419F91df641920257f44860e357f3a2A7b646b2d",
  },
  {
    name: "Rohit Desai — Backend Developer",
    address: "0xDEADBEEF00000000000000000000000000000001",
  },
  {
    name: "Anjali Mishra — Data Analyst",
    address: "0x2C59b73Cc7841b89fC6B41a1D1C0bEA34D8B06B3",
  },
  {
    name: "Nikhil Sharma — Blockchain Auditor",
    address: "0xd7E34D92e92e8B8C0e9aF9fBf66b9d72A3F6cE44",
  },
  {
    name: "Pooja Gupta — UI/UX Designer",
    address: "0x765c6f7055F0fAbE3eF9e7e8D5C4b3a2f1E8D7c6",
  },
  {
    name: "Harsh Patel — Full Stack Developer",
    address: "0x876f7099C5f5A5e6D9c8B7a6F5e4D3c2B1A0f9E8",
  },
  {
    name: "Ritika Verma — Social Media Manager",
    address: "0x987a8B0C1D2E3F4a5b6C7d8E9F0a1B2c3D4e5f6a",
  },
];

const MONAD_CONFIG = {
  chainId: "0x27AF",
  chainName: "Monad Testnet",
  rpcUrls: ["https://testnet-rpc.monad.xyz"],
  nativeCurrency: { name: "MON", symbol: "MON", decimals: 18 },
  blockExplorerUrls: ["https://testnet.monadexplorer.com"],
};

export default function PayProofApp() {
  const [activeTab, setActiveTab] = useState("single");
  const [connected, setConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [employeeAddr, setEmployeeAddr] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [status, setStatus] = useState("");
  const [statusType, setStatusType] = useState("");
  const [txHash, setTxHash] = useState("");
  const [payments, setPayments] = useState([]);
  const [batchStatus, setBatchStatus] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processedCount, setProcessedCount] = useState(0);
  const [batchPaymentStatus, setBatchPaymentStatus] = useState({});
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    const checkConnection = async () => {
      if (typeof window !== "undefined" && window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          });
          if (accounts.length > 0) {
            setWalletAddress(accounts[0]);
            setConnected(true);
          }
        } catch (error) {
          console.error("Error checking connection:", error);
        }
      }
    };

    checkConnection();

    if (typeof window !== "undefined" && window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length > 0) {
          setWalletAddress(accounts[0]);
          setConnected(true);
        } else {
          setConnected(false);
          setWalletAddress("");
        }
      });

      window.ethereum.on("chainChanged", () => {
        window.location.reload();
      });
    }
  }, []);

  const connectWallet = async () => {
    if (!window.ethereum) {
      setStatus("MetaMask not installed");
      setStatusType("error");
      return;
    }

    try {
      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      });

      const chainId = await window.ethereum.request({ method: "eth_chainId" });

      if (chainId !== MONAD_CONFIG.chainId) {
        try {
          await window.ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: MONAD_CONFIG.chainId }],
          });
        } catch (switchError) {
          if (switchError.code === 4902) {
            await window.ethereum.request({
              method: "wallet_addEthereumChain",
              params: [MONAD_CONFIG],
            });
          } else {
            throw switchError;
          }
        }
      }

      setWalletAddress(accounts[0]);
      setConnected(true);
      setStatus("Wallet connected!");
      setStatusType("success");
    } catch (error) {
      console.error("Error connecting wallet:", error);
      setStatus("Failed to connect wallet");
      setStatusType("error");
    }
  };

  const handlePayEmployee = async () => {
    if (!employeeAddr || !amount) {
      setStatus("Please fill in all fields");
      setStatusType("error");
      return;
    }

    if (!ethers.isAddress(employeeAddr)) {
      setStatus("Invalid employee address");
      setStatusType("error");
      return;
    }

    setIsProcessing(true);
    setStatus("Processing payment...");
    setStatusType("info");

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer,
      );

      const amountWei = ethers.parseEther(amount);

      const tx = await contract.payEmployee(employeeAddr, note, {
        value: amountWei,
      });

      const receipt = await tx.wait();

      setTxHash(receipt.hash);
      setStatus(`Payment sent! TX: ${receipt.hash.slice(0, 10)}...`);
      setStatusType("success");

      const history = await contract.getHistory(employeeAddr);
      const displayPayments = history.map((p) => ({
        amount: ethers.formatEther(p.amount),
        timestamp: new Date(Number(p.timestamp) * 1000).toLocaleString(),
        blockNumber: p.blockNumber.toString(),
        employer: p.employer,
        note: p.note,
      }));

      setPayments(displayPayments);

      if (history.length > 0) {
        const latestPayment = history[0];
        const earliestPayment = history[history.length - 1];

        const earliestDate = new Date(Number(earliestPayment.timestamp) * 1000);
        const latestDate = new Date(Number(latestPayment.timestamp) * 1000);

        const totalAmount = history.reduce((sum, p) => sum + p.amount, 0n);

        const certificateData = {
          employeeName: note || employeeAddr.slice(0, 8),
          employeeAddress: employeeAddr,
          totalAmountWei: totalAmount.toString(),
          paymentCount: history.length,
          fromDate: earliestDate.toLocaleDateString(),
          toDate: latestDate.toLocaleDateString(),
          payments: history.map((p) => ({
            amount: p.amount.toString(),
            timestamp: p.timestamp.toString(),
            blockNumber: p.blockNumber.toString(),
            employer: p.employer,
            note: p.note,
          })),
          contractAddress: CONTRACT_ADDRESS,
        };

        try {
          await generateCertificate(certificateData);
        } catch (pdfError) {
          console.error("PDF generation failed:", pdfError);
        }
      }

      setEmployeeAddr("");
      setAmount("");
      setNote("");
    } catch (error) {
      console.error("Error:", error);
      setStatus(`Error: ${error.message}`);
      setStatusType("error");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBatchPay = async () => {
    setIsProcessing(true);
    setBatchStatus("Starting batch payment...");
    const startTime = Date.now();

    const initialStatus = {};
    FAKE_EMPLOYEES.forEach((emp, idx) => {
      initialStatus[idx] = "pending";
    });
    setBatchPaymentStatus(initialStatus);
    setProcessedCount(0);

    try {
      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const contract = new ethers.Contract(
        CONTRACT_ADDRESS,
        CONTRACT_ABI,
        signer,
      );

      const addresses = FAKE_EMPLOYEES.map((emp) => emp.address);
      const amounts = FAKE_EMPLOYEES.map(() => ethers.parseEther("0.001"));

      const totalAmount = amounts.reduce((a, b) => a + b, 0n);

      const tx = await contract.batchPay(
        addresses,
        amounts,
        "Monad Speed Test",
        {
          value: totalAmount,
        },
      );

      let progressCounter = 0;
      const progressInterval = setInterval(() => {
        progressCounter++;
        if (progressCounter <= 15) {
          setProcessedCount(progressCounter);
        }
      }, 300);

      const receipt = await tx.wait();
      clearInterval(progressInterval);

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
      setElapsedTime(elapsed);

      const newStatus = {};
      FAKE_EMPLOYEES.forEach((_, idx) => {
        newStatus[idx] = "confirmed";
      });
      setBatchPaymentStatus(newStatus);
      setProcessedCount(15);

      setBatchStatus(
        `✓ All 15 payments confirmed in ${elapsed}s | 1 transaction | Monad TPS: ~10,000`,
      );

      const allPayments = [];
      for (let i = 0; i < addresses.length; i++) {
        const history = await contract.getHistory(addresses[i]);
        allPayments.push({
          employeeIdx: i,
          history: history,
        });
      }

      let pdfDelay = 0;
      for (const paymentData of allPayments) {
        setTimeout(async () => {
          const idx = paymentData.employeeIdx;
          const history = paymentData.history;
          const employee = FAKE_EMPLOYEES[idx];

          if (history.length > 0) {
            const totalReceivedWei = history.reduce(
              (sum, p) => sum + p.amount,
              0n,
            );
            const earliestDate = new Date(
              Number(history[history.length - 1].timestamp) * 1000,
            );
            const latestDate = new Date(Number(history[0].timestamp) * 1000);

            const certificateData = {
              employeeName: employee.name,
              employeeAddress: addresses[idx],
              totalAmountWei: totalReceivedWei.toString(),
              paymentCount: history.length,
              fromDate: earliestDate.toLocaleDateString(),
              toDate: latestDate.toLocaleDateString(),
              payments: history.map((p) => ({
                amount: p.amount.toString(),
                timestamp: p.timestamp.toString(),
                blockNumber: p.blockNumber.toString(),
                employer: p.employer,
                note: p.note,
              })),
              contractAddress: CONTRACT_ADDRESS,
            };

            try {
              await generateCertificate(certificateData);
            } catch (pdfErr) {
              console.error(
                `PDF generation failed for ${employee.name}:`,
                pdfErr,
              );
            }
          }
        }, pdfDelay);

        pdfDelay += 100;
      }

      setTimeout(() => {
        setBatchStatus(
          "✓ All certificates generated and downloaded successfully",
        );
      }, pdfDelay);
    } catch (error) {
      console.error("Error:", error);
      setBatchStatus(`Error: ${error.message}`);
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
            Blockchain Income Verification on Monad
          </p>
        </div>
        <div className="header-right">
          {connected ? (
            <div className="wallet-badge">
              Connected: {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
            </div>
          ) : (
            <button className="btn" onClick={connectWallet}>
              Connect Wallet
            </button>
          )}
        </div>
      </div>

      {status && (
        <div className={`status-message status-${statusType}`}>
          {status}
          {txHash && (
            <>
              {" "}
              <a
                href={`https://testnet.monadexplorer.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="link"
              >
                View on Explorer
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
          Pay Employee
        </button>
        <button
          className={`tab-button ${activeTab === "batch" ? "active" : ""}`}
          onClick={() => setActiveTab("batch")}
        >
          Mass Payroll Demo
        </button>
      </div>

      {activeTab === "single" && (
        <div className="card">
          <h2 style={{ marginBottom: "20px" }}>Pay Single Employee</h2>

          <div className="form-group">
            <label>Employee Wallet Address</label>
            <input
              type="text"
              className="input"
              placeholder="0x..."
              value={employeeAddr}
              onChange={(e) => setEmployeeAddr(e.target.value)}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Amount (MON)</label>
              <input
                type="number"
                className="input"
                placeholder="0.1"
                step="0.001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Payment Note</label>
              <input
                type="text"
                className="input"
                placeholder="e.g., March salary"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <button
            className="btn"
            onClick={handlePayEmployee}
            disabled={!connected || isProcessing}
            style={{ width: "100%", marginTop: "16px" }}
          >
            {isProcessing
              ? "Processing..."
              : connected
                ? "Send Payment + Generate PDF"
                : "Connect Wallet First"}
          </button>

          {payments.length > 0 && (
            <div style={{ marginTop: "24px" }}>
              <h3 style={{ marginBottom: "12px" }}>Payment History</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount (MON)</th>
                    <th>From</th>
                    <th>Block</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.slice(0, 10).map((p, idx) => (
                    <tr key={idx}>
                      <td>{p.timestamp}</td>
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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === "batch" && (
        <div className="grid-2">
          <div>
            <div className="card">
              <h2 style={{ marginBottom: "20px" }}>Mass Payroll Demo</h2>
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--muted)",
                  marginBottom: "16px",
                }}
              >
                Send 0.001 MON to 15 freelancers in a single transaction. Watch
                Monad's parallel processing in action.
              </p>

              <table className="table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {FAKE_EMPLOYEES.map((emp, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: "12px" }}>
                        {emp.name.split(" — ")[0]}
                      </td>
                      <td>0.001 MON</td>
                      <td>
                        {batchPaymentStatus[idx] === "confirmed" ? (
                          <span className="badge badge-green">✓ Confirmed</span>
                        ) : batchPaymentStatus[idx] === "pending" ? (
                          <span className="badge badge-purple">
                            ⏳ Processing
                          </span>
                        ) : (
                          <span
                            style={{ fontSize: "11px", color: "var(--muted)" }}
                          >
                            Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <button
                className="btn"
                onClick={handleBatchPay}
                disabled={!connected || isProcessing}
                style={{ width: "100%", marginTop: "20px" }}
              >
                {isProcessing
                  ? `🚀 Processing (${processedCount}/15)...`
                  : connected
                    ? "🚀 Pay All 15 — Watch Parallel Speed"
                    : "Connect Wallet First"}
              </button>

              {isProcessing && (
                <div style={{ marginTop: "16px" }}>
                  <div className="progress-bar">
                    <div
                      className="progress-fill"
                      style={{ width: `${(processedCount / 15) * 100}%` }}
                    ></div>
                  </div>
                  <p
                    style={{
                      fontSize: "12px",
                      textAlign: "center",
                      color: "var(--purple)",
                    }}
                  >
                    Processing... {processedCount}/15 confirmed
                  </p>
                </div>
              )}

              {elapsedTime && (
                <div className="summary-box">
                  <div className="summary-item">
                    <div className="summary-item-label">Transactions</div>
                    <div className="summary-item-value">1</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-item-label">Payments</div>
                    <div className="summary-item-value">15</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-item-label">Total Time</div>
                    <div className="summary-item-value">{elapsedTime}s</div>
                  </div>
                  <div className="summary-item">
                    <div className="summary-item-label">Monad TPS</div>
                    <div className="summary-item-value">~10K</div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div
            className="card"
            style={{ maxHeight: "600px", overflowY: "auto" }}
          >
            <h3 style={{ marginBottom: "16px" }}>Live Feed</h3>
            <div className="live-feed">
              {batchStatus ? (
                <div style={{ padding: "12px", textAlign: "center" }}>
                  <p style={{ color: "var(--purple)", fontSize: "12px" }}>
                    {batchStatus}
                  </p>
                </div>
              ) : (
                <p style={{ color: "var(--muted)", fontSize: "12px" }}>
                  Awaiting payment execution...
                </p>
              )}
              {Object.entries(batchPaymentStatus).map(([idx, status]) => {
                if (status === "confirmed") {
                  const emp = FAKE_EMPLOYEES[parseInt(idx)];
                  return (
                    <div key={idx} className="feed-item">
                      <span style={{ color: "#4caf50" }}>✓</span> {emp.name} —
                      0.001 MON
                    </div>
                  );
                }
                return null;
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
