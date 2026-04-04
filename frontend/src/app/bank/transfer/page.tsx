"use client";

import { useState } from "react";

const FASTAPI_URL = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

type TransferState = "idle" | "analyzing" | "intercepted" | "mfa_required" | "honeypot" | "approved";

interface TriageResult {
  fraud_classification: string;
  risk_score: number;
  transaction_action: string;
  reasoning_summary: string;
  confidence: number;
}

const FRAUD_LABEL: Record<string, string> = {
  "APP Fraud": "🚨 APP Fraud Detected",
  "Money Mule": "🔴 Money Mule Pattern",
  "Transaction Smurfing": "⚠️ Smurfing Detected",
  "Hub-and-Spoke": "🔴 Hub-and-Spoke Ring",
  "Benign": "✅ Transaction Clear",
};

const ACTION_MESSAGES: Record<string, { title: string; desc: string; color: string; bg: string }> = {
  freeze_transfer: {
    title: "Transaction Frozen",
    desc: "FinShield AI has blocked this transfer. The recipient account is linked to an active money mule ring detected by our GNN. Your money is safe — no funds have been sent.",
    color: "#EF4444",
    bg: "#FEF2F2",
  },
  step_up_mfa: {
    title: "Step-Up Verification Required",
    desc: "This is a high-value transfer to a first-time beneficiary — a common APP Fraud signal. Please verify your identity via OTP before this transaction proceeds.",
    color: "#D97706",
    bg: "#FFFBEB",
  },
  honeypot_escrow: {
    title: "Transaction Intercepted — Under Review",
    desc: "This transfer has been placed in our secure escrow system. It appears real to the recipient but funds will not be released until fraud analysis is complete (up to 4 hours). No action required.",
    color: "#7C3AED",
    bg: "#F5F3FF",
  },
  flag_reversal: {
    title: "Flagged for Reversal Review",
    desc: "Our AI triage engine has flagged this as a potential APP Fraud transaction. A compliance officer will review within 4 hours. If you were socially engineered, we can initiate a reversal.",
    color: "#EA580C",
    bg: "#FFF7ED",
  },
  alert_compliance: {
    title: "Transfer Sent — Under Monitoring",
    desc: "Transfer initiated with compliance team notification. Transaction patterns have been flagged for review in our SOC dashboard.",
    color: "#4F46E5",
    bg: "#EEF2FF",
  },
  approve: {
    title: "Transfer Successful",
    desc: "Transaction verified by FinShield AI. No fraud signals detected. Money is on its way!",
    color: "#059669",
    bg: "#ECFDF5",
  },
};

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: "100vh", background: "#F8FAFC" },
  nav: {
    background: "#FFFFFF",
    borderBottom: "1px solid #E2E8F0",
    padding: "0 24px",
    height: 60,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    position: "sticky",
    top: 0,
    zIndex: 10,
  },
  main: { maxWidth: 500, margin: "0 auto", padding: "32px 16px" },
  card: { background: "#FFFFFF", borderRadius: 20, padding: "32px 28px", border: "1px solid #E2E8F0", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" },
  label: { display: "block", fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 },
  input: {
    width: "100%",
    height: 48,
    border: "1.5px solid #E2E8F0",
    borderRadius: 12,
    padding: "0 16px",
    fontSize: 14,
    color: "#1A1A2E",
    outline: "none",
    boxSizing: "border-box" as const,
    background: "#FAFAFA",
    transition: "border-color 150ms",
  },
  amountRow: { display: "flex", alignItems: "center", border: "1.5px solid #E2E8F0", borderRadius: 12, background: "#FAFAFA", overflow: "hidden" },
  rupee: { padding: "0 14px", fontSize: 16, fontWeight: 700, color: "#0F4C81", background: "#EFF6FF", borderRight: "1.5px solid #E2E8F0", height: 48, display: "flex", alignItems: "center" },
  select: {
    width: "100%",
    height: 48,
    border: "1.5px solid #E2E8F0",
    borderRadius: 12,
    padding: "0 16px",
    fontSize: 14,
    color: "#1A1A2E",
    outline: "none",
    background: "#FAFAFA",
  },
  btn: {
    width: "100%",
    height: 52,
    background: "linear-gradient(135deg, #0F4C81, #1565C0)",
    color: "#FFFFFF",
    border: "none",
    borderRadius: 14,
    fontSize: 15,
    fontWeight: 700,
    cursor: "pointer",
    letterSpacing: "-0.01em",
  },
};

export default function ZeroBankTransfer() {
  const [upi, setUpi] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("personal");
  const [isNewBeneficiary, setIsNewBeneficiary] = useState(false);
  const [transferState, setTransferState] = useState<TransferState>("idle");
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [otpValue, setOtpValue] = useState("");
  const [otpSent, setOtpSent] = useState(false);

  const runGnnTriage = async (amountVal: number): Promise<TriageResult | null> => {
    try {
      const txnId = `TXN-${Date.now().toString(36).toUpperCase()}`;
      // Quick analysis via triage endpoint
      const res = await fetch(
        `${FASTAPI_URL}/api/triage/analyze`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: txnId,
            amount: amountVal,
            channel: "UPI",
            sender_account_age_days: 800,
            beneficiary_account_age_days: isNewBeneficiary ? Math.floor(Math.random() * 25 + 5) : 400,
            frequency_of_new_beneficiaries: isNewBeneficiary ? 0.85 : 0.1,
            is_new_beneficiary: isNewBeneficiary,
            recent_transfers_to_same_beneficiary: 0,
            hub_spoke_score: amountVal > 200000 ? 0.72 : amountVal > 50000 ? 0.45 : 0.1,
            purpose,
          }),
        }
      );
      if (!res.ok) throw new Error();
      const data = await res.json();
      return {
        fraud_classification: data.fraud_classification || data.threat_classification || "Benign",
        risk_score: data.risk_score ?? data.confidence ?? 0.1,
        transaction_action: data.transaction_action ?? data.mitigation_action ?? "approve",
        reasoning_summary: data.reasoning_summary ?? "",
        confidence: data.confidence ?? 0.5,
      };
    } catch {
      // Fallback: local rule-based
      const amountN = amountVal;
      if (amountN > 200000 && isNewBeneficiary) {
        return { fraud_classification: "APP Fraud", risk_score: 0.91, transaction_action: "freeze_transfer", reasoning_summary: `₹${amountN.toLocaleString("en-IN")} to a first-time beneficiary is a classic APP Fraud signal. Transfer blocked.`, confidence: 0.91 };
      }
      if (amountN > 100000 && isNewBeneficiary) {
        return { fraud_classification: "APP Fraud", risk_score: 0.78, transaction_action: "step_up_mfa", reasoning_summary: `High-value push payment ₹${amountN.toLocaleString("en-IN")} to new beneficiary. Social engineering risk detected.`, confidence: 0.78 };
      }
      if (amountN > 50000 && purpose === "personal") {
        return { fraud_classification: "APP Fraud", risk_score: 0.62, transaction_action: "honeypot_escrow", reasoning_summary: `Moderately elevated risk: ₹${amountN.toLocaleString("en-IN")} personal transfer. Routing to escrow for 4h review.`, confidence: 0.62 };
      }
      return { fraud_classification: "Benign", risk_score: 0.08, transaction_action: "approve", reasoning_summary: "Transaction within normal parameters. No fraud signals detected.", confidence: 0.92 };
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!upi || !amount) return;

    const amountVal = parseFloat(amount);
    if (isNaN(amountVal) || amountVal <= 0) return;

    setTransferState("analyzing");
    setTriageResult(null);

    const result = await runGnnTriage(amountVal);
    setTriageResult(result);

    if (!result) {
      setTransferState("approved");
      return;
    }

    switch (result.transaction_action) {
      case "freeze_transfer":      setTransferState("intercepted"); break;
      case "step_up_mfa":         setTransferState("mfa_required"); break;
      case "honeypot_escrow":     setTransferState("honeypot"); break;
      case "flag_reversal":       setTransferState("intercepted"); break;
      default:                    setTransferState("approved"); break;
    }
  };

  const handleMfaConfirm = () => {
    if (otpValue.length >= 4) {
      setTransferState("approved");
      setTriageResult((prev) => prev ? { ...prev, transaction_action: "approve", fraud_classification: "Benign" } : null);
    }
  };

  const reset = () => {
    setTransferState("idle");
    setTriageResult(null);
    setUpi("");
    setAmount("");
    setOtpValue("");
    setOtpSent(false);
    setIsNewBeneficiary(false);
  };

  const amountNum = parseFloat(amount) || 0;
  const actionInfo = triageResult ? (ACTION_MESSAGES[triageResult.transaction_action] ?? ACTION_MESSAGES["approve"]) : null;

  return (
    <div style={s.page}>
      <nav style={s.nav}>
        <a href="/bank/dashboard" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none" }}>
          <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="#0F4C81" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
          </svg>
          <span style={{ fontSize: 14, fontWeight: 600, color: "#0F4C81" }}>Back to Account</span>
        </a>
        <span><span style={{ fontWeight: 700, color: "#0F4C81" }}>Zero</span><span style={{ fontWeight: 700, color: "#00B4A6" }}>Bank</span></span>
      </nav>

      <div style={s.main}>
        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#0F4C81", marginBottom: 4, letterSpacing: "-0.02em" }}>Transfer Money</h1>
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>
          Protected by FinShield GNN Transaction Integrity (F7)
        </p>

        {/* ── GNN Analysis Status / Result ── */}
        {transferState === "analyzing" && (
          <div style={{ background: "#EFF6FF", border: "1px solid #BFDBFE", borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" style={{ color: "#0F4C81" }}>
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <div>
                <p style={{ fontSize: 13, fontWeight: 700, color: "#0F4C81", marginBottom: 2 }}>FinShield GNN Analyzing…</p>
                <p style={{ fontSize: 12, color: "#3B82F6" }}>
                  Checking beneficiary account age · Hub-spoke score · Transaction frequency
                </p>
              </div>
            </div>
          </div>
        )}

        {actionInfo && transferState !== "analyzing" && (
          <div style={{ background: actionInfo.bg, border: `1px solid ${actionInfo.color}30`, borderRadius: 12, padding: "16px 20px", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: actionInfo.color, marginBottom: 4 }}>
                  {actionInfo.title}
                </p>
                <p style={{ fontSize: 12, color: "#374151", lineHeight: 1.6, marginBottom: triageResult?.reasoning_summary ? 8 : 0 }}>
                  {actionInfo.desc}
                </p>
                {triageResult?.reasoning_summary && (
                  <p style={{ fontSize: 11, color: "#6B7280", lineHeight: 1.5, padding: "8px 10px", background: "rgba(0,0,0,0.03)", borderRadius: 8, fontStyle: "italic" }}>
                    <strong>AI Analysis:</strong> {triageResult.reasoning_summary}
                  </p>
                )}
              </div>
            </div>

            {/* Risk score bar */}
            {triageResult && (
              <div style={{ marginTop: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: "#6B7280" }}>GNN Risk Score</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: actionInfo.color, fontFamily: "monospace" }}>
                    {FRAUD_LABEL[triageResult.fraud_classification] ?? triageResult.fraud_classification}
                    {" · "}
                    {(triageResult.risk_score * 100).toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: 6, background: "#E5E7EB", borderRadius: 9999, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${triageResult.risk_score * 100}%`,
                    background: triageResult.risk_score > 0.75 ? "#EF4444" : triageResult.risk_score > 0.50 ? "#F59E0B" : "#10B981",
                    borderRadius: 9999,
                    transition: "width 0.6s ease",
                  }} />
                </div>
              </div>
            )}

            {/* Retry / Reset */}
            {(transferState === "intercepted" || transferState === "honeypot" || transferState === "approved") && (
              <button
                onClick={reset}
                style={{ marginTop: 12, fontSize: 12, fontWeight: 600, color: actionInfo.color, background: "transparent", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                {transferState === "approved" ? "Make another transfer" : "Try a different transfer"}
              </button>
            )}
          </div>
        )}

        {/* ── Step-Up MFA Panel ── */}
        {transferState === "mfa_required" && (
          <div style={{ background: "#FFFBEB", border: "1px solid #FCD34D", borderRadius: 12, padding: "20px", marginBottom: 20 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: "#D97706", marginBottom: 8 }}>
              🔐 Verify Your Identity
            </p>
            <p style={{ fontSize: 12, color: "#374151", marginBottom: 16 }}>
              A one-time password has been sent to your registered mobile number. Enter it below to release this ₹{amountNum.toLocaleString("en-IN")} transfer.
            </p>
            {!otpSent ? (
              <button
                onClick={() => setOtpSent(true)}
                style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "10px 20px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
              >
                Send OTP
              </button>
            ) : (
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otpValue}
                  onChange={(e) => setOtpValue(e.target.value.slice(0, 6))}
                  style={{ flex: 1, height: 44, border: "1.5px solid #FCD34D", borderRadius: 10, padding: "0 14px", fontSize: 14, outline: "none", background: "#fff" }}
                />
                <button
                  onClick={handleMfaConfirm}
                  style={{ background: "#D97706", color: "#fff", border: "none", borderRadius: 10, padding: "0 18px", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  Verify
                </button>
              </div>
            )}
            <button
              onClick={reset}
              style={{ marginTop: 10, fontSize: 12, color: "#6B7280", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              Cancel transfer
            </button>
          </div>
        )}

        {/* ── Transfer Form ── */}
        {(transferState === "idle" || transferState === "analyzing") && (
          <div style={s.card}>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: 18 }}>
                <label style={s.label}>UPI ID or Phone Number</label>
                <input
                  type="text"
                  placeholder="username@upi or 98XXXXXXXX"
                  value={upi}
                  onChange={(e) => setUpi(e.target.value)}
                  style={s.input}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "#0F4C81")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "#E2E8F0")}
                />
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={s.label}>Amount</label>
                <div style={s.amountRow}>
                  <span style={s.rupee}>₹</span>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    style={{ flex: 1, height: 48, border: "none", outline: "none", padding: "0 16px", fontSize: 16, fontWeight: 600, background: "transparent", color: "#1A1A2E" }}
                  />
                </div>
                {/* Live risk hint */}
                {amountNum > 100000 && (
                  <p style={{ fontSize: 11, color: "#D97706", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
                    ⚠️ High-value transfer — GNN will perform enhanced fraud check
                  </p>
                )}
              </div>

              <div style={{ marginBottom: 18 }}>
                <label style={s.label}>Purpose</label>
                <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={s.select}>
                  <option value="personal">Personal Transfer</option>
                  <option value="business">Business Payment</option>
                  <option value="rent">Rent</option>
                  <option value="investment">Investment</option>
                  <option value="emergency">Emergency</option>
                  <option value="other">Other</option>
                </select>
                {(purpose === "investment" || purpose === "emergency") && (
                  <p style={{ fontSize: 11, color: "#DC2626", marginTop: 5 }}>
                    ⚠️ &ldquo;Investment&rdquo; and &ldquo;Emergency&rdquo; are top social engineering pretexts for APP Fraud
                  </p>
                )}
              </div>

              {/* New Beneficiary toggle */}
              <div style={{ marginBottom: 28, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#F8FAFC", borderRadius: 10, border: "1.5px solid #E2E8F0" }}>
                <input
                  type="checkbox"
                  id="newBeneficiary"
                  checked={isNewBeneficiary}
                  onChange={(e) => setIsNewBeneficiary(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: "pointer" }}
                />
                <label htmlFor="newBeneficiary" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>
                  First time sending to this person
                </label>
                {isNewBeneficiary && amountNum > 50000 && (
                  <span style={{ marginLeft: "auto", fontSize: 10, color: "#DC2626", fontWeight: 600, background: "#FEF2F2", padding: "2px 8px", borderRadius: 6 }}>
                    HIGH RISK
                  </span>
                )}
              </div>

              <button
                type="submit"
                style={{
                  ...s.btn,
                  opacity: transferState === "analyzing" ? 0.7 : 1,
                  cursor: transferState === "analyzing" ? "not-allowed" : "pointer",
                }}
                disabled={transferState === "analyzing"}
              >
                {transferState === "analyzing"
                  ? "Analyzing with FinShield AI…"
                  : "Confirm Transfer →"}
              </button>
            </form>
          </div>
        )}

        {/* Security notice */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>
            Protected by FinShield GNN · APP Fraud Detection · Mule Ring Monitoring
          </span>
        </div>

        {/* Quick contacts */}
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Recent Contacts</p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
            {["Priya Kapoor", "Amit Singh", "Riya Mehta", "Vikram Nair"].map(name => (
              <div
                key={name}
                onClick={() => { setUpi(name.toLowerCase().replace(" ", ".") + "@upi"); setIsNewBeneficiary(false); }}
                style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", flexShrink: 0 }}
              >
                <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg, #0F4C81, #00B4A6)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 14, fontWeight: 700 }}>
                  {name.split(" ").map(w => w[0]).join("")}
                </div>
                <span style={{ fontSize: 11, color: "#64748B", textAlign: "center", maxWidth: 56, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name.split(" ")[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
