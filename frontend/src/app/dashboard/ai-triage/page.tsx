"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { ThreatFeed } from "@/components/dashboard/ThreatFeed";

export default function AITriagePage() {
  return (
    <PageShell>
      <PageHeader
        badge="F4"
        badgeClass="fs-badge-indigo"
        title="AI Triage Brain"
        description="Every flagged session is sent to Claude AI. Within 2 seconds: attack type classified, severity scored 0–10, mitigation executed. No human in the loop. No alert fatigue."
        statusLabel="Claude AI · ~2s latency"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-indigo)" dimColor="var(--fs-indigo-dim)">
        Traditional security generates thousands of alerts that analysts must review. Most are false alarms.
        Real threats get buried — analysts stop taking alerts seriously. FinShield&apos;s AI triage
        <strong style={{ color: "var(--fs-text-primary)" }}> replaces the first layer entirely</strong>:
        reads the alert, decides if it is real, classifies the attack type, scores severity, and executes mitigation —
        all in under 2 seconds, with a natural-language explanation.
      </InsightBox>

      {/* Attack type legend */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {[
          { badge: "Credential Stuffing", color: "var(--fs-red)",    dim: "var(--fs-red-dim)",    border: "rgba(239,68,68,0.2)",   desc: "Leaked passwords tested at scale" },
          { badge: "API Abuse",           color: "var(--fs-orange)",  dim: "var(--fs-orange-dim)", border: "rgba(249,115,22,0.2)",   desc: "Endpoints probed for data extraction" },
          { badge: "Money Mule",          color: "var(--fs-purple)",  dim: "var(--fs-purple-dim)", border: "rgba(168,85,247,0.2)",   desc: "Relay account network detected" },
          { badge: "Account Takeover",    color: "var(--fs-amber)",   dim: "var(--fs-amber-dim)",  border: "rgba(245,158,11,0.2)",   desc: "Stolen session or auth bypass attempt" },
        ].map(item => (
          <div key={item.badge} className="fs-card" style={{ padding: "18px 20px" }}>
            <span
              className="inline-flex rounded px-2 py-0.5 text-[11px] font-semibold mb-3"
              style={{ background: item.dim, color: item.color, border: `1px solid ${item.border}` }}
            >
              {item.badge}
            </span>
            <p className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
          </div>
        ))}
      </div>

      {/* Pipeline */}
      <div className="fs-card">
        <p className="fs-label mb-6" style={{ color: "var(--fs-text-secondary)" }}>AI Triage Pipeline — Under 2 Seconds</p>
        <div className="flex items-start gap-0">
          {[
            { step: "1", title: "Signal ingested", desc: "Biometric score, network cluster ID, IP reputation, request fingerprint", color: "var(--fs-green)", border: "rgba(0,220,130,0.3)" },
            { step: "2", title: "Claude classifies", desc: "LLM reads all signals, determines attack type, severity 0–10", color: "var(--fs-indigo)", border: "rgba(99,102,241,0.3)" },
            { step: "3", title: "Decision returned", desc: "JSON: { type, severity, reason, action } — parsed in real time", color: "var(--fs-teal)", border: "rgba(20,184,166,0.3)" },
            { step: "4", title: "Mitigation fired", desc: "Block, honeypot redirect, or flag — executed automatically in <200ms", color: "var(--fs-amber)", border: "rgba(245,158,11,0.3)" },
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
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Live AI Triage Decisions</p>
        <ThreatFeed />
      </div>
    </PageShell>
  );
}
