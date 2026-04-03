"use client";
import { PageShell } from "@/components/dashboard/PageShell";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { ThreatFeed } from "@/components/dashboard/ThreatFeed";
import { SessionMonitor } from "@/components/dashboard/SessionMonitor";
import { NetworkGraph } from "@/components/dashboard/NetworkGraph";
import { MuleRingPanel } from "@/components/dashboard/MuleRingPanel";
import { HoneypotPanel } from "@/components/dashboard/HoneypotPanel";
import { RedTeamPanel } from "@/components/dashboard/RedTeamPanel";
import { FederationMesh } from "@/components/dashboard/FederationMesh";

export default function DashboardPage() {
  return (
    <PageShell>
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--fs-text-primary)", letterSpacing: "-0.02em" }}>
            Mission Control
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--fs-text-secondary)" }}>
            Full system overview — all panels live
          </p>
        </div>
        <div
          className="fs-status-pill fs-status-green"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot" style={{ background: "var(--fs-green)", opacity: 0.5 }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--fs-green)" }} />
          </span>
          All systems operational
        </div>
      </div>

      <StatsOverview />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2"><ThreatFeed /></div>
        <div className="lg:col-span-1"><SessionMonitor /></div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <NetworkGraph />
        <MuleRingPanel />
      </div>

      <HoneypotPanel />
      <RedTeamPanel />
      <FederationMesh />
    </PageShell>
  );
}
