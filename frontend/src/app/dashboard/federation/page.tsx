"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { FederationMesh } from "@/components/dashboard/FederationMesh";

export default function FederationPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F6"
        badgeClass="fs-badge-purple"
        title="Fraud Ring Signature Federation"
        description="When Bank A identifies a mule account cluster, we share the mathematical pattern of that ring with GPay and Bank B — so they can flag similar flows before the money leaves their system."
        statusLabel="8 banks connected"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-purple)" dimColor="var(--fs-purple-dim)">
        Scammers test new mule rings on smaller banks first, then scale across the network.
        With fraud ring signature sharing, detecting a ring at any bank is effectively detecting it at all of them.
        By the time the fraud ring targets Bank B,{" "}
        <strong style={{ color: "var(--fs-text-primary)" }}>Bank B already has Bank A&apos;s ring signature</strong>
        {" "} — and blocks it before ₹1 exits the system.
      </InsightBox>

      {/* How it works */}
      <div className="fs-card">
        <p className="fs-label mb-5" style={{ color: "var(--fs-text-secondary)" }}>
          How Fraud Ring Signature Sharing Works
        </p>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
          {[
            {
              step: "01",
              icon: "🔍",
              color: "var(--fs-orange)",
              title: "Ring Detected",
              desc: "Bank A's GNN (F7) detects a hub-and-spoke mule ring: 47 GPay accounts funneling ₹50k–₹85k to a single exit wallet within 2 hours.",
            },
            {
              step: "02",
              icon: "📡",
              color: "var(--fs-indigo)",
              title: "Signature Broadcast",
              desc: "An anonymized graph signature (node degree distribution + transfer velocity pattern) is broadcast to all 8 partner banks via Federated Learning. Zero customer PII is shared.",
            },
            {
              step: "03",
              icon: "🛡️",
              color: "var(--fs-green)",
              title: "Network-Wide Block",
              desc: "GPay, Bank B, PhonePe update their local GNN models in <340ms. The mule ring's exit wallet is flagged before the money moves anywhere else.",
            },
          ].map(item => (
            <div key={item.step} className="rounded-lg p-4" style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}>
              <div className="mb-3 flex items-center gap-3">
                <span className="tabular text-[11px] font-bold" style={{ color: "var(--fs-text-tertiary)" }}>{item.step}</span>
                <span className="text-2xl">{item.icon}</span>
              </div>
              <p className="text-[13px] font-semibold mb-2" style={{ color: item.color }}>{item.title}</p>
              <p className="text-[12px] leading-relaxed" style={{ color: "var(--fs-text-secondary)" }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { value: "340ms", label: "Ring signature propagation", color: "var(--fs-green)" },
          { value: "8",     label: "Banks in federation", color: "var(--fs-indigo)" },
          { value: "0",     label: "Customer records shared", color: "var(--fs-teal)" },
          { value: "ε=2.1", label: "Differential Privacy budget", color: "var(--fs-purple)" },
        ].map(item => (
          <div key={item.label} className="fs-card text-center" style={{ padding: "20px" }}>
            <p className="tabular mb-1" style={{ fontSize: 26, fontWeight: 700, color: item.color, letterSpacing: "-0.02em" }}>
              {item.value}
            </p>
            <p className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>{item.label}</p>
          </div>
        ))}
      </div>

      <FederationMesh />
    </PageShell>
  );
}
