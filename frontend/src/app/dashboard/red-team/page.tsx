"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { RedTeamPanel } from "@/components/dashboard/RedTeamPanel";
import { AlertTriangle } from "lucide-react";

const techniques = [
  { name: "Credential Stuffing", rate: 99.2 },
  { name: "Slow-drip ATO",       rate: 97.8 },
  { name: "API scraping",        rate: 98.5 },
  { name: "Session hijacking",   rate: 96.1 },
  { name: "Biometric spoofing",  rate: 94.3 },
  { name: "Synthetic identity",  rate: 91.7 },
  { name: "Token replay",        rate: 99.8 },
  { name: "Proxy rotation",      rate: 88.9 },
];

export default function RedTeamPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F8"
        badgeClass="fs-badge-red"
        title="Autonomous Red Team Agent"
        description="An AI that continuously attacks its own defenses — probing for gaps, testing new techniques, and generating patch recommendations the moment it finds a bypass. Security that never stops testing itself."
        statusLabel="Agent running · Simulated"
        statusClass="amber"
      />

      <InsightBox accentColor="var(--fs-red)" dimColor="var(--fs-red-dim)">
        Every security system gradually becomes obsolete as attackers innovate. Human penetration testers are expensive
        and only available occasionally. FinShield&apos;s red team agent runs 24/7 — cycling through attack techniques,
        testing every defense layer, and automatically generating patches when it finds a gap.
        The result: a system that <strong style={{ color: "var(--fs-text-primary)" }}>self-improves faster than attackers can adapt</strong>.
      </InsightBox>

      {/* Technique metric cards */}
      <div>
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Attack Techniques — Block Rate</p>
        <div className="grid grid-cols-4 gap-4">
          {techniques.map(item => (
            <div
              key={item.name}
              className="fs-card group"
              style={{ padding: "16px 18px" }}
            >
              <p className="text-[12px] font-semibold mb-2" style={{ color: "var(--fs-text-primary)" }}>
                {item.name}
              </p>
              <p
                className="tabular mb-2 transition-all"
                style={{
                  fontSize: 24,
                  fontWeight: 700,
                  color: "var(--fs-green)",
                  letterSpacing: "-0.02em",
                }}
              >
                {item.rate}%
              </p>
              <div className="fs-progress mb-1.5">
                <div
                  className="fs-progress-fill transition-all duration-700"
                  style={{ width: `${item.rate}%` }}
                />
              </div>
              <p className="fs-label" style={{ color: "var(--fs-text-tertiary)", fontSize: 10 }}>Block rate</p>
            </div>
          ))}
        </div>
      </div>

      {/* Demo note */}
      <div
        className="flex gap-4 rounded-xl p-5"
        style={{
          background: "var(--fs-amber-dim)",
          borderLeft: "3px solid var(--fs-amber)",
        }}
      >
        <AlertTriangle size={16} className="shrink-0 mt-0.5" style={{ color: "var(--fs-amber)" }} />
        <p className="text-[13px] leading-relaxed" style={{ color: "var(--fs-text-secondary)" }}>
          <strong style={{ color: "var(--fs-amber)" }}>Demo note:</strong> The full reinforcement learning agent
          that genuinely learns and adapts over time is on the post-hackathon roadmap. This demo cycles through
          8 attack techniques, occasionally surfaces a simulated bypass, and generates real AI-powered patch
          recommendations via Claude. All UI data written to the database is real.
        </p>
      </div>

      {/* Full panel */}
      <RedTeamPanel />
    </PageShell>
  );
}
