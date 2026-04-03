"use client";

export default function ZeroBankTerminated() {
  return (
    <div style={{
      minHeight: "100vh",
      background: "#FFF8F8",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 24,
    }}>
      <div style={{
        background: "#FFFFFF",
        borderRadius: 24,
        padding: "56px 40px",
        maxWidth: 400,
        width: "100%",
        textAlign: "center",
        boxShadow: "0 4px 6px rgba(0,0,0,0.05), 0 20px 60px rgba(239,68,68,0.08)",
        border: "1px solid #FEE2E2",
      }}>
        {/* Red shield icon */}
        <div style={{
          width: 80,
          height: 80,
          margin: "0 auto 24px",
          background: "#FEF2F2",
          borderRadius: "50%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          border: "2px solid #FCA5A5",
        }}>
          <svg width="40" height="40" fill="none" viewBox="0 0 24 24" stroke="#EF4444" strokeWidth={1.8}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 700, color: "#DC2626", marginBottom: 12, letterSpacing: "-0.02em" }}>
          Session Terminated
        </h1>

        <p style={{ fontSize: 14, color: "#64748B", lineHeight: 1.6, marginBottom: 28 }}>
          This session has been flagged for suspicious activity. If you believe this is an error, please contact support at{" "}
          <a href="mailto:support@zerobank.in" style={{ color: "#0F4C81", fontWeight: 600 }}>support@zerobank.in</a>
        </p>

        <div style={{ background: "#FEF2F2", borderRadius: 12, padding: "12px 16px", marginBottom: 28, border: "1px solid #FEE2E2" }}>
          <p style={{ fontSize: 12, color: "#991B1B", fontWeight: 600, marginBottom: 4 }}>Security Reference</p>
          <p style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#DC2626" }}>
            {`SEC-${Date.now().toString(16).toUpperCase()}`}
          </p>
        </div>

        <a
          href="/bank"
          style={{
            display: "block",
            height: 48,
            lineHeight: "48px",
            background: "#0F4C81",
            color: "#FFFFFF",
            borderRadius: 12,
            fontSize: 14,
            fontWeight: 600,
            textDecoration: "none",
            marginBottom: 12,
          }}
        >
          Return to Login
        </a>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 16 }}>
          <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
          </svg>
          <span style={{ fontSize: 11, color: "#94A3B8" }}>Detected and protected by FinShield AI</span>
        </div>
      </div>
    </div>
  );
}
