"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { MuleRingPanel } from "@/components/dashboard/MuleRingPanel";

export default function MuleRingPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F7"
        badgeClass="fs-badge-orange"
        title="Money Mule Ring Detector"
        description="Each mule account looks perfectly normal in isolation. The crime is only visible in the graph — coordinated flows funneling toward a small set of exit wallets. FinShield's GNN sees it automatically."
        statusLabel="GNN analysis active"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-orange)" dimColor="var(--fs-orange-dim)">
        Traditional fraud detection asks: &ldquo;Is this account doing anything suspicious?&rdquo; A mule account receives
        a transfer and forwards it — exactly what millions of legitimate accounts do daily.
        FinShield&apos;s GNN asks a different question:
        &ldquo;<strong style={{ color: "var(--fs-text-primary)" }}>Does this group</strong> show coordinated mule ring movement?&rdquo;
        This question is only answerable by looking at the graph — which is why traditional systems miss it entirely.
      </InsightBox>

      {/* Anatomy */}
      <div className="fs-card">
        <p className="fs-label mb-6" style={{ color: "var(--fs-text-secondary)" }}>Anatomy of a Money Mule Ring</p>
        <div className="grid grid-cols-3 gap-8">
          {[
            { level: "Entry Accounts", icon: "💳", color: "var(--fs-indigo)", desc: "Victim funds deposited here. Recruited or compromised accounts. Appear completely normal in isolation." },
            { level: "Relay Accounts", icon: "🔄", color: "var(--fs-amber)", desc: "Intermediate relay layer. Funds move through in <24 hours. Each relay unknowing or complicit." },
            { level: "Exit Wallets",   icon: "🚨", color: "var(--fs-red)",    desc: "Terminal accounts. Funds withdrawn as cash or crypto. These nodes go red and pulse in the GNN graph." },
          ].map(item => (
            <div key={item.level} className="text-center">
              <div className="mb-3 text-3xl">{item.icon}</div>
              <p className="text-[13px] font-bold mb-2" style={{ color: item.color }}>{item.level}</p>
              <p className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <MuleRingPanel />
    </PageShell>
  );
}
