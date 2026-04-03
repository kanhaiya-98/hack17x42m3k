"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

const FASTAPI = "http://localhost:8000";

export default function ZeroBankLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }
    setLoading(true);

    try {
      // Create a real session in FinShield
      const res = await fetch(`${FASTAPI}/api/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip: "0.0.0.0",
          user_agent: navigator.userAgent,
          fingerprint_id: "fp_" + Math.random().toString(36).substr(2, 9),
          bank_id: "BANK-A",
        }),
      });
      if (res.ok) {
        const data = await res.json();
        sessionStorage.setItem("finshield_session_id", data.session_id);
        sessionStorage.setItem("zerobank_email", email);
      }
    } catch {
      // Proceed even if API is down
    }

    // Navigate regardless — auth is intentionally absent
    await new Promise(r => setTimeout(r, 600));
    router.push("/bank/dashboard");
  };

  const styles = {
    page: {
      minHeight: "100vh",
      background: "linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F0FDF4 100%)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
    } as React.CSSProperties,
    card: {
      background: "#FFFFFF",
      borderRadius: 24,
      padding: "48px 40px",
      width: "100%",
      maxWidth: 420,
      boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05), 0 20px 60px -10px rgba(15,76,129,0.12)",
      border: "1px solid rgba(15,76,129,0.08)",
    } as React.CSSProperties,
    logo: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      marginBottom: 32,
      textDecoration: "none",
    } as React.CSSProperties,
    logoIcon: {
      width: 36,
      height: 36,
      background: "linear-gradient(135deg, #0F4C81, #00B4A6)",
      borderRadius: 10,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    } as React.CSSProperties,
    logoText: {
      fontSize: 22,
      letterSpacing: "-0.02em",
    } as React.CSSProperties,
    headline: {
      fontSize: 26,
      fontWeight: 700,
      color: "#0F4C81",
      letterSpacing: "-0.02em",
      marginBottom: 6,
    } as React.CSSProperties,
    sub: {
      fontSize: 14,
      color: "#64748B",
      marginBottom: 32,
    } as React.CSSProperties,
    label: {
      display: "block",
      fontSize: 13,
      fontWeight: 600,
      color: "#374151",
      marginBottom: 6,
    } as React.CSSProperties,
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
      transition: "border-color 150ms",
      background: "#FAFAFA",
    } as React.CSSProperties,
    inputGroup: {
      marginBottom: 16,
    } as React.CSSProperties,
    btn: {
      width: "100%",
      height: 48,
      background: loading
        ? "#94A3B8"
        : "linear-gradient(135deg, #0F4C81 0%, #1565C0 100%)",
      color: "#FFFFFF",
      border: "none",
      borderRadius: 12,
      fontSize: 15,
      fontWeight: 600,
      cursor: loading ? "not-allowed" : "pointer",
      marginTop: 8,
      transition: "all 150ms",
      letterSpacing: "-0.01em",
    } as React.CSSProperties,
  };

  return (
    <div style={styles.page}>
      <div style={{ ...styles.card, animation: shake ? "shake 0.4s ease" : undefined }}>
        {/* Logo */}
        <a href="/bank" style={styles.logo}>
          <div style={styles.logoIcon}>
            <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="white" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span style={styles.logoText}>
            <span style={{ color: "#0F4C81", fontWeight: 700 }}>Zero</span>
            <span style={{ color: "#00B4A6", fontWeight: 700 }}>Bank</span>
          </span>
        </a>

        <h1 style={styles.headline}>Welcome back</h1>
        <p style={styles.sub}>Sign in to your ZeroBank account</p>

        <form onSubmit={handleLogin} autoComplete="off">
          <div style={styles.inputGroup}>
            <label style={styles.label}>Email address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={styles.input}
              onFocus={e => (e.currentTarget.style.borderColor = "#0F4C81")}
              onBlur={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
            />
          </div>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={styles.input}
              onFocus={e => (e.currentTarget.style.borderColor = "#0F4C81")}
              onBlur={e => (e.currentTarget.style.borderColor = "#E2E8F0")}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 20 }}>
            <a href="#" style={{ fontSize: 13, color: "#0F4C81", textDecoration: "none", fontWeight: 500 }}>
              Forgot password?
            </a>
          </div>

          <button type="submit" style={styles.btn} disabled={loading}>
            {loading ? (
              <span style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", borderRadius: "50%", display: "inline-block", animation: "spin 0.7s linear infinite" }} />
                Signing in…
              </span>
            ) : "Sign In"}
          </button>
        </form>

        <p style={{ textAlign: "center", marginTop: 20, fontSize: 14, color: "#64748B" }}>
          New to ZeroBank?{" "}
          <a href="#" style={{ color: "#0F4C81", fontWeight: 600, textDecoration: "none" }}>Create account</a>
        </p>

        {/* FinShield badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 28, paddingTop: 20, borderTop: "1px solid #F1F5F9" }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span style={{ fontSize: 11, color: "#94A3B8", letterSpacing: "0.04em" }}>Protected by FinShield AI</span>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-6px); }
          40%,80% { transform: translateX(6px); }
        }
      `}</style>
    </div>
  );
}
