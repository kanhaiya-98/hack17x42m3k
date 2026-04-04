"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { TransactionRiskFeed } from "@/components/dashboard/TransactionRiskFeed";

export default function AITriagePage() {
  return (
    <PageShell>
      <PageHeader
        badge="F4"
        badgeClass="fs-badge-indigo"
        title="AI Transaction Triage Engine"
        description="Every UPI transfer is analyzed by Gemini AI before funds move. Within 2 seconds: fraud type classified, risk scored 0–10, kill-chain action executed. No human in the loop. No alert fatigue."
        statusLabel="Gemini 2.5 Flash · ~2s latency"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-indigo)" dimColor="var(--fs-indigo-dim)">
        Traditional bank fraud detection runs after the money has already moved.
        FinShield F4 runs <strong style={{ color: "var(--fs-text-primary)" }}>between the &ldquo;Confirm Transfer&rdquo; tap and the actual NEFT/UPI execution</strong>.
        It reads transaction metadata — not passwords or mouse movements — and decides: approve, step-up MFA, escrow, or freeze.
        Input signals: amount, beneficiary account age, frequency of new beneficiaries, GNN hub-spoke score.
      </InsightBox>

      {/* Fraud type legend */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          {
            badge: "APP Fraud",
            color: "var(--fs-red)",
            dim: "var(--fs-red-dim)",
            border: "rgba(239,68,68,0.2)",
            action: "Step-up MFA / Block",
            desc: "Victim socially engineered into large push payment (investment/emergency scam)",
          },
          {
            badge: "Money Mule",
            color: "var(--fs-purple)",
            dim: "var(--fs-purple-dim)",
            border: "rgba(168,85,247,0.2)",
            action: "Honeypot Escrow",
            desc: "Legitimate account relaying stolen funds — young account, high new-beneficiary frequency",
          },
          {
            badge: "Smurfing",
            color: "var(--fs-amber)",
            dim: "var(--fs-amber-dim)",
            border: "rgba(245,158,11,0.2)",
            action: "Alert Compliance",
            desc: "Many small UPI transfers (₹7k–₹9.9k) to same exit wallet to avoid ₹10k reporting threshold",
          },
          {
            badge: "Hub-and-Spoke",
            color: "var(--fs-orange)",
            dim: "var(--fs-orange-dim)",
            border: "rgba(249,115,22,0.2)",
            action: "Freeze + Federation Broadcast",
            desc: "47+ GPay accounts funneling into 1 exit wallet within 2h — GNN detects the aggregation hub",
          },
        ].map(item => (
          <div key={item.badge} className="fs-card" style={{ padding: "18px 20px" }}>
            <span
              className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold mb-2"
              style={{ background: item.dim, color: item.color, border: `1px solid ${item.border}` }}
            >
              {item.badge}
            </span>
            <p className="text-[11px] font-semibold mb-1.5" style={{ color: item.color }}>→ {item.action}</p>
            <p className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* GPay Kill Chain flow */}
      <div className="fs-card">
        <p className="fs-label mb-6" style={{ color: "var(--fs-text-secondary)" }}>
          The GPay Kill Chain — Under 2 Seconds
        </p>
        <div className="flex items-start gap-0">
          {[
            {
              step: "1",
              title: "User taps Confirm",
              desc: "₹50,000 transfer initiated. GNN score + transaction metadata ingested before NEFT/UPI executes.",
              color: "var(--fs-green)",
              border: "rgba(0,220,130,0.3)",
            },
            {
              step: "2",
              title: "Gemini classifies",
              desc: "LLM analyzes: beneficiary age, hub-spoke score, transfer amount vs. account history. Determines: APP Fraud / Mule / Smurfing.",
              color: "var(--fs-indigo)",
              border: "rgba(99,102,241,0.3)",
            },
            {
              step: "3",
              title: "Kill Chain executed",
              desc: "JSON: { classification, risk_score, action }. If risk > 0.85 → freeze. If new beneficiary high amount → step-up MFA. If mule → honeypot.",
              color: "var(--fs-teal)",
              border: "rgba(20,184,166,0.3)",
            },
            {
              step: "4",
              title: "Federation updated",
              desc: "Pattern of the detected fraud ring broadcast to all 8 partner banks via F6. They block the same exit wallet in <340ms.",
              color: "var(--fs-purple)",
              border: "rgba(168,85,247,0.3)",
            },
          ].map((item, i) => (
            <div key={item.step} className="flex flex-1 items-start">
              <div className="flex-1">
                <div
                  className="mb-3 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ border: `1px solid ${item.border}`, color: item.color }}
                >
                  {item.step}
                </div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--fs-text-primary)" }}>{item.title}</p>
                <p className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
              {i < 3 && <div className="mt-3 shrink-0 px-3 text-[16px]" style={{ color: "var(--fs-text-tertiary)" }}>→</div>}
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Live Transaction Risk Feed</p>
        <TransactionRiskFeed />
      </div>
    </PageShell>
  );
}
