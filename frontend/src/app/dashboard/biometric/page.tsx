"use client";
import { PageShell, PageHeader, InsightBox, ConceptGrid } from "@/components/dashboard/PageShell";
import { StatsOverview } from "@/components/dashboard/StatsOverview";
import { SessionMonitor } from "@/components/dashboard/SessionMonitor";

export default function BiometricPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F1"
        badgeClass="fs-badge-green"
        title="Invisible Behavior Scanner"
        description="Every human has a unique interaction signature — keystroke timing, mouse arc, scroll rhythm. FinShield records this invisibly and catches bots whose patterns are mathematically too clean to be human."
        statusLabel="Active · 3000ms polling"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-green)" dimColor="var(--fs-green-dim)">
        The most advanced bots today fake human behavior — random delays, curved mouse paths, rotating IPs.
        Standard systems are fooled. FinShield is not, because it does not check whether delays exist —
        it analyzes the <strong style={{ color: "var(--fs-text-primary)" }}>statistical character</strong> of
        the entire interaction pattern. Real humans have chaos. Bots produce patterns too consistent to be human.
      </InsightBox>

      <ConceptGrid items={[
        { icon: "⌨️", label: "Keystroke Dynamics", desc: "Hold time, flight time, inter-key rhythm — unique as a fingerprint." },
        { icon: "🖱️", label: "Mouse Biometrics", desc: "Arc curvature, micro-wobbles, pre-click hesitation analyzed." },
        { icon: "📊", label: "Neural Fingerprint", desc: "LSTM trained on millions of sessions — catches what rules never could." },
      ]} />

      <StatsOverview />

      <div>
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Live Session Analysis Feed</p>
        <SessionMonitor />
      </div>

      <div className="fs-card">
        <p className="fs-label mb-5" style={{ color: "var(--fs-text-secondary)" }}>Detection Pipeline</p>
        <div className="grid grid-cols-4 gap-6">
          {[
            { n: "01", title: "Session starts", desc: "JS SDK initializes invisibly. Zero UX impact, <50KB overhead." },
            { n: "02", title: "Signals captured", desc: "Keystrokes, mouse paths, touch events, scroll patterns — all recorded." },
            { n: "03", title: "Model scores", desc: "Vectors through trained LSTM. Confidence 0–100 updated in real time." },
            { n: "04", title: "Action fired", desc: "Above threshold → flag, honeypot redirect, or hard block in <200ms." },
          ].map(item => (
            <div key={item.n}>
              <p className="text-3xl font-black mb-2" style={{ color: "var(--fs-text-tertiary)", letterSpacing: "-0.04em" }}>{item.n}</p>
              <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--fs-text-primary)" }}>{item.title}</p>
              <p className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </PageShell>
  );
}
