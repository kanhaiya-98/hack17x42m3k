"use client";

import { useState } from "react";

export default function ZeroBankTransfer() {
  const [upi, setUpi] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("personal");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
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
    main: { maxWidth: 480, margin: "0 auto", padding: "32px 16px" },
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
      boxSizing: "border-box",
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
        <p style={{ fontSize: 14, color: "#64748B", marginBottom: 28 }}>Send money instantly via UPI</p>

        {submitted && (
          <div style={{ background: "#ECFDF5", border: "1px solid #A7F3D0", borderRadius: 12, padding: "12px 16px", marginBottom: 20, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 18 }}>✅</span>
            <span style={{ fontSize: 13, color: "#065F46", fontWeight: 600 }}>Transfer initiated! Processing may take a few seconds.</span>
          </div>
        )}

        <div style={s.card}>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={s.label}>UPI ID or Phone Number</label>
              <input
                type="text"
                placeholder="username@upi or 98XXXXXXXX"
                value={upi}
                onChange={e => setUpi(e.target.value)}
                style={s.input}
                onFocus={e => (e.currentTarget.style.borderColor = "#0F4C81")}
                onBlur={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
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
                  onChange={e => setAmount(e.target.value)}
                  style={{ flex: 1, height: 48, border: "none", outline: "none", padding: "0 16px", fontSize: 16, fontWeight: 600, background: "transparent", color: "#1A1A2E" }}
                />
              </div>
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={s.label}>Purpose</label>
              <select value={purpose} onChange={e => setPurpose(e.target.value)} style={s.select}>
                <option value="personal">Personal Transfer</option>
                <option value="business">Business Payment</option>
                <option value="rent">Rent</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button type="submit" style={s.btn}>Confirm Transfer →</button>
          </form>
        </div>

        {/* Security notice */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20 }}>
          <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
          </svg>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>Secured by 256-bit encryption · Monitored by FinShield AI</span>
        </div>

        {/* Quick contacts */}
        <div style={{ marginTop: 28 }}>
          <p style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 12 }}>Recent Contacts</p>
          <div style={{ display: "flex", gap: 12, overflowX: "auto" }}>
            {["Priya Kapoor", "Amit Singh", "Riya Mehta", "Vikram Nair"].map(name => (
              <div
                key={name}
                onClick={() => setUpi(name.toLowerCase().replace(" ", ".") + "@upi")}
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
