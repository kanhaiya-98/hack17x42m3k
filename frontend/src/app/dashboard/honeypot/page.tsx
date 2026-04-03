"use client";
import { PageShell, PageHeader, InsightBox } from "@/components/dashboard/PageShell";
import { HoneypotPanel } from "@/components/dashboard/HoneypotPanel";

export default function HoneypotPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F5"
        badgeClass="fs-badge-amber"
        title="The Trap — Adaptive Honeypot"
        description="Don't block attackers. Redirect them silently into a fake bank powered by AI-generated financial data. They think they're winning. They're actually being logged, fingerprinted, and studied."
        statusLabel="Honeypot active"
        statusClass="amber"
      />

      <InsightBox accentColor="var(--fs-amber)" dimColor="var(--fs-amber-dim)">
        Every time you block an attacker, you learn nothing — and they adjust. The honeypot reverses this entirely.
        The attacker thinks they succeeded. They waste expensive proxy bandwidth and compute time.
        And they unknowingly reveal their <strong style={{ color: "var(--fs-text-primary)" }}>complete attack methodology</strong> —
        password lists, endpoint map, user agent rotation, API assumptions. This intelligence makes every future catch automatic.
      </InsightBox>

      {/* Block vs Honeypot */}
      <div className="grid grid-cols-2 gap-4">
        <div className="rounded-xl p-5" style={{ border: "1px solid rgba(239,68,68,0.12)", background: "var(--fs-red-dim)" }}>
          <p className="fs-label mb-3" style={{ color: "var(--fs-red)" }}>Traditional Block</p>
          <ul className="space-y-2 text-[13px]" style={{ color: "var(--fs-text-secondary)" }}>
            {["Attacker knows they were detected", "Immediately adjusts and retries", "You learn nothing about their method", "Next attack is harder to catch"].map(t => (
              <li key={t} className="flex gap-2"><span style={{ color: "var(--fs-red)" }}>✗</span>{t}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl p-5" style={{ border: "1px solid rgba(245,158,11,0.2)", background: "var(--fs-amber-dim)" }}>
          <p className="fs-label mb-3" style={{ color: "var(--fs-amber)" }}>FinShield Honeypot</p>
          <ul className="space-y-2 text-[13px]" style={{ color: "var(--fs-text-secondary)" }}>
            {["Attacker believes they succeeded", "Wastes expensive residential proxy bandwidth", "Reveals complete attack methodology", "Intelligence auto-improves future detection"].map(t => (
              <li key={t} className="flex gap-2"><span style={{ color: "var(--fs-green)" }}>✓</span>{t}</li>
            ))}
          </ul>
        </div>
      </div>

      <HoneypotPanel />
    </PageShell>
  );
}
