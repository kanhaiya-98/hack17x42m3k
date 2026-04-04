"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { MuleRingPanel } from "@/components/dashboard/MuleRingPanel";
import { TransactionRiskFeed } from "@/components/dashboard/TransactionRiskFeed";

export default function MuleRingPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F7"
        badgeClass="fs-badge-orange"
        title="GNN Money Mule & APP Fraud Detector"
        description="Each mule account looks perfectly normal in isolation. The crime is only visible in the graph — 47 GPay users sending money to 1 exit wallet within 2 hours. FinShield's GNN sees it automatically."
        statusLabel="GNN analysis active"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-orange)" dimColor="var(--fs-orange-dim)">
        Traditional fraud detection asks: &ldquo;Is this account doing anything suspicious?&rdquo; A mule account receives
        a transfer and forwards it — exactly what millions of legitimate accounts do daily.
        FinShield&apos;s GNN asks a different question using <strong style={{ color: "var(--fs-text-primary)" }}>transaction-level node features</strong>:
        avg_transaction_value · frequency_of_new_beneficiaries · time_since_account_creation.
        This combination reveals hub-and-spoke patterns invisible to per-account rules.
      </InsightBox>

      {/* Three attack types the mentor wants */}
      <div className="fs-card">
        <p className="fs-label mb-6" style={{ color: "var(--fs-text-secondary)" }}>
          UPI/GPay Fraud Patterns Detected by F7
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              icon: "💳",
              color: "var(--fs-red)",
              title: "APP Fraud",
              subtitle: "Authorized Push Payment",
              desc: "Victim is socially engineered (fake investment, emergency) into voluntarily sending ₹50k–₹5L to a scammer. GNN flags: high amount + first-time beneficiary + short account age.",
              action: "Step-up MFA or Block",
            },
            {
              icon: "🔄",
              color: "var(--fs-purple)",
              title: "Money Mule Network",
              subtitle: "Hub-and-Spoke Pattern",
              desc: "47 clean GPay accounts each send ₹30k–₹85k to 1 exit wallet within 2 hours to funnel stolen money under the radar. GNN detects the hub node automatically.",
              action: "Freeze Exit Wallet + Federation Broadcast",
            },
            {
              icon: "🪄",
              color: "var(--fs-amber)",
              title: "Transaction Smurfing",
              subtitle: "Below-Threshold Structuring",
              desc: "Breaking a ₹5L transfer into 60× ₹8,200 UPI payments to stay under the ₹10,000 RBI automatic reporting threshold. GNN detects the clustering pattern.",
              action: "Alert Compliance + Flag Chain",
            },
          ].map(item => (
            <div key={item.title} className="rounded-lg p-4" style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}>
              <div className="mb-3 text-3xl">{item.icon}</div>
              <p className="text-[13px] font-bold mb-0.5" style={{ color: item.color }}>{item.title}</p>
              <p className="text-[10px] font-semibold mb-2 uppercase tracking-wider" style={{ color: "var(--fs-text-tertiary)" }}>{item.subtitle}</p>
              <p className="text-[12px] mb-3" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
              <div className="rounded px-2 py-1 text-[11px] font-semibold inline-block" style={{ background: `${item.color}15`, color: item.color, border: `1px solid ${item.color}30` }}>
                → {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* GNN Node Features */}
      <div className="fs-card">
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>GNN Node Features Used</p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { feature: "avg_transaction_value", desc: "Average ₹ value per transfer. High single-value to new beneficiary = APP Fraud.", example: "> ₹1,00,000 → risk +35%" },
            { feature: "frequency_of_new_beneficiaries", desc: "Fraction of transfers to first-time recipients. Mule relays constantly receive from strangers.", example: "> 0.80 → Mule relay flag" },
            { feature: "time_since_account_creation", desc: "Days since account opened. Temporary mule nodes are usually <30 days old.", example: "< 30 days → risk +10%" },
          ].map(item => (
            <div key={item.feature} className="rounded-lg p-4" style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}>
              <p className="font-mono text-[11px] font-bold mb-2" style={{ color: "var(--fs-orange)" }}>{item.feature}</p>
              <p className="text-[12px] mb-2" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.5 }}>{item.desc}</p>
              <p className="font-mono text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>{item.example}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction Risk Feed */}
      <div>
        <p className="fs-label mb-3" style={{ color: "var(--fs-text-secondary)" }}>
          Live Transaction Risk Feed
        </p>
        <TransactionRiskFeed />
      </div>

      <MuleRingPanel />
    </PageShell>
  );
}
