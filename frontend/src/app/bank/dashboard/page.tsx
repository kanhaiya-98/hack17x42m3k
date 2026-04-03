"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

const TRANSACTIONS = [
  { id: "UPI/CR/260401/847291034", merchant: "Swiggy", type: "Food & Dining", amount: -847, date: "Today, 1:23 PM", icon: "🍔" },
  { id: "UPI/CR/260401/293847561", merchant: "Amazon Pay", type: "Shopping", amount: -2299, date: "Today, 11:45 AM", icon: "📦" },
  { id: "UPI/CR/260401/738291047", merchant: "PhonePe Wallet", type: "Transfer", amount: 5000, date: "Yesterday, 4:12 PM", icon: "💸" },
  { id: "UPI/CR/260401/192847365", merchant: "HDFC Credit Card", type: "Bill Payment", amount: -12540, date: "Apr 2, 10:30 AM", icon: "💳" },
  { id: "UPI/CR/260401/567382910", merchant: "Zomato", type: "Food & Dining", amount: -312, date: "Apr 2, 8:55 PM", icon: "🍕" },
  { id: "UPI/CR/260401/847261930", merchant: "Flipkart", type: "Shopping", amount: -1499, date: "Apr 1, 3:20 PM", icon: "🛍️" },
  { id: "UPI/CR/260401/293017485", merchant: "BSES Electricity", type: "Utilities", amount: -2847, date: "Apr 1, 9:00 AM", icon: "⚡" },
  { id: "UPI/CR/260401/103847291", merchant: "Salary Credit", type: "Income", amount: 85000, date: "Apr 1, 6:00 AM", icon: "💰" },
  { id: "UPI/CR/260401/582910374", merchant: "BookMyShow", type: "Entertainment", amount: -750, date: "Mar 31, 7:45 PM", icon: "🎬" },
  { id: "UPI/CR/260401/847291056", merchant: "Ola Cabs", type: "Transport", amount: -245, date: "Mar 31, 6:30 AM", icon: "🚗" },
];

export default function ZeroBankDashboard() {
  const router = useRouter();
  const [email, setEmail] = useState("rahul.sharma@gmail.com");
  const [mfaVisible, setMfaVisible] = useState(false);
  const [otp, setOtp] = useState("");
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const stored = sessionStorage.getItem("zerobank_email");
    if (stored) setEmail(stored);
  }, []);

  const actions = [
    { icon: "➕", label: "Add Money", color: "#0F4C81" },
    { icon: "↗️", label: "Transfer", color: "#00B4A6", href: "/bank/transfer" },
    { icon: "📋", label: "Pay Bills", color: "#F97316" },
    { icon: "📊", label: "History", color: "#6366F1" },
  ];

  const s = {
    page: { minHeight: "100vh", background: "#F8FAFC" } as React.CSSProperties,
    // TopNav
    nav: {
      background: "#FFFFFF",
      borderBottom: "1px solid #E2E8F0",
      padding: "0 24px",
      height: 60,
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      position: "sticky" as const,
      top: 0,
      zIndex: 10,
    } as React.CSSProperties,
    avatar: {
      width: 36, height: 36, borderRadius: "50%",
      background: "linear-gradient(135deg, #0F4C81, #00B4A6)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: 14, fontWeight: 700,
    } as React.CSSProperties,
    // Balance card
    balanceCard: {
      background: "linear-gradient(135deg, #0F4C81 0%, #1565C0 60%, #00B4A6 100%)",
      borderRadius: 20,
      padding: "32px 28px",
      color: "#FFFFFF",
      position: "relative" as const,
      overflow: "hidden",
      boxShadow: "0 8px 32px rgba(15,76,129,0.25)",
    } as React.CSSProperties,
  };

  return (
    <div style={s.page}>
      {/* MFA Overlay */}
      {mfaVisible && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center",
        }}>
          <div style={{ background: "#fff", borderRadius: 20, padding: "40px 36px", width: 380, boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ textAlign: "center", marginBottom: 24 }}>
              <div style={{ fontSize: 40, marginBottom: 12 }}>🔐</div>
              <p style={{ fontSize: 20, fontWeight: 700, color: "#0F4C81", marginBottom: 6 }}>Verification Required</p>
              <p style={{ fontSize: 13, color: "#64748B" }}>Additional verification required for your security. Enter the OTP sent to your registered mobile.</p>
            </div>
            <input
              type="text"
              maxLength={6}
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ""))}
              style={{ width: "100%", height: 48, border: "1.5px solid #E2E8F0", borderRadius: 12, padding: "0 16px", fontSize: 18, textAlign: "center", letterSpacing: "0.2em", boxSizing: "border-box", marginBottom: 16, fontWeight: 600 }}
            />
            <button
              onClick={() => { if (otp.length === 6) setMfaVisible(false); }}
              style={{ width: "100%", height: 48, background: "#0F4C81", color: "#fff", border: "none", borderRadius: 12, fontSize: 15, fontWeight: 600, cursor: "pointer" }}
            >
              Verify
            </button>
          </div>
        </div>
      )}

      {/* Top Nav */}
      <nav style={s.nav}>
        <a href="/bank" style={{ textDecoration: "none", display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 28, height: 28, background: "linear-gradient(135deg, #0F4C81, #00B4A6)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span><span style={{ fontWeight: 700, color: "#0F4C81" }}>Zero</span><span style={{ fontWeight: 700, color: "#00B4A6" }}>Bank</span></span>
        </a>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 13, color: "#64748B" }}>Rahul Sharma</span>
          <div style={s.avatar}>RS</div>
        </div>
      </nav>

      {/* Main Content */}
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "24px 16px" }}>

        {/* Balance Card */}
        <div style={s.balanceCard}>
          {/* Decorative circles */}
          <div style={{ position: "absolute", right: -40, top: -40, width: 160, height: 160, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
          <div style={{ position: "absolute", right: 20, bottom: -60, width: 120, height: 120, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

          <div style={{ position: "relative" }}>
            <p style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", opacity: 0.7, marginBottom: 8 }}>Available Balance</p>
            <p style={{ fontSize: 40, fontWeight: 800, letterSpacing: "-0.02em", marginBottom: 4, fontVariantNumeric: "tabular-nums" }}>
              ₹2,47,832<span style={{ fontSize: 24, fontWeight: 600, opacity: 0.8 }}>.50</span>
            </p>
            <p style={{ fontSize: 12, opacity: 0.6, fontFamily: "'JetBrains Mono', monospace" }}>ZERO •••• •••• 4821</p>

            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 24 }}>
              <div>
                <p style={{ fontSize: 10, opacity: 0.6, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>This Month</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#A7F3D0" }}>+₹85,000</p>
              </div>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: 10, opacity: 0.6, marginBottom: 2, textTransform: "uppercase", letterSpacing: "0.06em" }}>Spent</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#FCA5A5" }}>-₹21,339</p>
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginTop: 20 }}>
          {actions.map(a => (
            <a
              key={a.label}
              href={a.href || "#"}
              style={{
                background: "#FFFFFF",
                borderRadius: 16,
                padding: "16px 8px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
                border: "1px solid #E2E8F0",
                textDecoration: "none",
                boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                transition: "transform 150ms, box-shadow 150ms",
                cursor: "pointer",
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 4px 12px rgba(15,76,129,0.12)"; }}
              onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 1px 4px rgba(0,0,0,0.04)"; }}
            >
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${a.color}15`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>
                {a.icon}
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, color: "#374151" }}>{a.label}</span>
            </a>
          ))}
        </div>

        {/* Recent Transactions */}
        <div style={{ marginTop: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#0F4C81" }}>Recent Transactions</h2>
            <a href="#" style={{ fontSize: 13, color: "#00B4A6", fontWeight: 600, textDecoration: "none" }}>View all</a>
          </div>

          <div style={{ background: "#FFFFFF", borderRadius: 16, border: "1px solid #E2E8F0", overflow: "hidden" }}>
            {TRANSACTIONS.map((tx, i) => (
              <div
                key={tx.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderBottom: i < TRANSACTIONS.length - 1 ? "1px solid #F1F5F9" : "none",
                  gap: 12,
                }}
              >
                <div style={{ width: 40, height: 40, borderRadius: 12, background: "#F8FAFC", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, border: "1px solid #E2E8F0" }}>
                  {tx.icon}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "#1A1A2E", marginBottom: 2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{tx.merchant}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", fontFamily: "'JetBrains Mono', monospace" }}>{tx.id}</p>
                </div>
                <div style={{ textAlign: "right" }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: tx.amount > 0 ? "#10B981" : "#1A1A2E", fontVariantNumeric: "tabular-nums" }}>
                    {tx.amount > 0 ? "+" : ""}₹{Math.abs(tx.amount).toLocaleString()}
                  </p>
                  <p style={{ fontSize: 10, color: "#94A3B8" }}>{tx.date}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", padding: "24px 0", borderTop: "1px solid #E2E8F0", marginTop: 24 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
            <span style={{ fontSize: 11, color: "#94A3B8" }}>Protected by FinShield AI · 256-bit encryption</span>
          </div>
        </div>
      </div>
    </div>
  );
}
