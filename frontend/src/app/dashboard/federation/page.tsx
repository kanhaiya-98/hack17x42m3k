"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { FederationMesh } from "@/components/dashboard/FederationMesh";

export default function FederationPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F6"
        badgeClass="fs-badge-purple"
        title="Federation Intelligence Mesh"
        description="What one bank learns, all banks know — in 340 milliseconds. No customer data shared. Only the mathematical gradient of what was learned flows between institutions."
        statusLabel="4 banks connected"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-purple)" dimColor="var(--fs-purple-dim)">
        Attackers test new techniques on smaller targets first, then rotate to bigger ones.
        With federated sharing, testing a technique on any bank in the network is effectively
        testing it on all of them simultaneously. By the time the attacker reaches Bank B,
        Bank B <strong style={{ color: "var(--fs-text-primary)" }}>already has Bank A&apos;s defense</strong>.
      </InsightBox>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { value: "340ms", label: "Cross-bank update", color: "var(--fs-green)" },
          { value: "4",     label: "Banks in federation", color: "var(--fs-indigo)" },
          { value: "0",     label: "Customer records shared", color: "var(--fs-teal)" },
          { value: "100%",  label: "RBI mandate compliant", color: "var(--fs-purple)" },
        ].map(item => (
          <div key={item.label} className="fs-card text-center" style={{ padding: "20px" }}>
            <p className="tabular mb-1" style={{ fontSize: 28, fontWeight: 700, color: item.color, letterSpacing: "-0.02em" }}>
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
