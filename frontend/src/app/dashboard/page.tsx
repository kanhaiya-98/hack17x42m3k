"use client";
import { PageShell } from "@/components/dashboard/PageShell";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { TransactionRiskFeed } from "@/components/dashboard/TransactionRiskFeed";
import { NetworkGraph } from "@/components/dashboard/NetworkGraph";
import { MuleRingPanel } from "@/components/dashboard/MuleRingPanel";
import { HoneypotPanel } from "@/components/dashboard/HoneypotPanel";
import { FederationMesh } from "@/components/dashboard/FederationMesh";

export default function DashboardPage() {
  return (
    <PageShell>
      {/* Page title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 600, color: "var(--fs-text-primary)", letterSpacing: "-0.02em" }}>
            Transaction Intelligence Hub
          </h1>
          <p className="mt-1 text-[14px]" style={{ color: "var(--fs-text-secondary)" }}>
            Post-login fraud detection · GNN Mule Ring · Federation · Kill Chain actions
          </p>
        </div>
        <div className="fs-status-pill fs-status-green">
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot" style={{ background: "var(--fs-green)", opacity: 0.5 }} />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--fs-green)" }} />
          </span>
          All systems operational
        </div>
      </div>

      {/* ── Stats ── */}
      <StatsOverview />

      {/* ── PRIMARY: Transaction Risk Feed (center of gravity) ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div
            className="h-4 w-1 rounded-full"
            style={{ background: "var(--fs-orange)" }}
          />
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--fs-orange)" }}>
            Live UPI Transaction Risk Feed
          </span>
          <span className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
            — GNN F7 · Detects APP Fraud · Money Mule · Smurfing
          </span>
        </div>
        <TransactionRiskFeed />
      </div>

      {/* ── GNN Graph + Mule Ring Detector ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full" style={{ background: "var(--fs-purple)" }} />
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--fs-purple)" }}>
            Hub-and-Spoke Graph Analysis (F7 GNN)
          </span>
          <span className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
            — Node features: avg_txn_value · new_beneficiary_freq · account_age
          </span>
        </div>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NetworkGraph />
          <MuleRingPanel />
        </div>
      </div>

      {/* ── Honeypot Escrow ── */}
      <HoneypotPanel />

      {/* ── Federation Intelligence Mesh ── */}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <div className="h-4 w-1 rounded-full" style={{ background: "var(--fs-indigo)" }} />
          <span className="text-[12px] font-semibold uppercase tracking-wider" style={{ color: "var(--fs-indigo)" }}>
            Fraud Ring Signature Federation (F6)
          </span>
          <span className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
            — Bank A detects mule cluster → broadcasts pattern → Bank B/GPay flag before money exits
          </span>
        </div>
        <FederationMesh />
      </div>
    </PageShell>
  );
}
