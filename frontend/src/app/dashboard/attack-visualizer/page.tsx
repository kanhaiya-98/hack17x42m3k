"use client";
import { PageShell, PageHeader, InsightBox, ConceptGrid } from "@/components/dashboard/PageShell";
import { NetworkGraph } from "@/components/dashboard/NetworkGraph";
import { ThreatFeed } from "@/components/dashboard/ThreatFeed";

export default function AttackVisualizerPage() {
  return (
    <PageShell>
      <PageHeader
        badge="F3"
        badgeClass="fs-badge-teal"
        title="Attack Visualizer"
        description="While the behavior scanner watches individual sessions, the network analyzer sees all sessions simultaneously — turning invisible low-and-slow attacks into visually obvious clustering patterns."
        statusLabel="Network analysis active"
        statusClass="green"
      />

      <InsightBox accentColor="var(--fs-teal)" dimColor="var(--fs-teal-dim)">
        The most dangerous attacks spread across hundreds of IPs, each one below any suspicious threshold.
        Individually, they look completely legitimate. Only when you see them <strong style={{ color: "var(--fs-text-primary)" }}>all together</strong> does
        the coordinated attack become visible. Watch the graph: blue-green dots float freely, red dots cluster.
      </InsightBox>

      <ConceptGrid items={[
        { icon: "🕸️", label: "Force-Directed Graph", desc: "Every session is a node. Bot clusters visibly pull together under physics simulation." },
        { icon: "🌐", label: "Globe Arc Visualization", desc: "Attack origins mapped in real time. Arcs converge on target bank." },
        { icon: "📈", label: "Rate Timeline", desc: "Legitimate traffic as steady line. Bot spike appears, then drops when intercepted." },
      ]} />

      <div>
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Live Network Attack Graph</p>
        <NetworkGraph />
      </div>

      <div className="fs-card">
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Reading the Graph</p>
        <div className="grid grid-cols-3 gap-6">
          {[
            { color: "var(--fs-green)", label: "Blue-green nodes", desc: "Legitimate human sessions. Float independently, no clustering force." },
            { color: "var(--fs-amber)", label: "Amber nodes", desc: "Low-confidence bot sessions. Beginning to pull toward the cluster." },
            { color: "var(--fs-red)", label: "Red cluster mass", desc: "Confirmed attack. One coordinated ring. Fully formed — easily readable." },
          ].map(item => (
            <div key={item.label} className="flex gap-3">
              <div className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ background: item.color }} />
              <div>
                <p className="text-[13px] font-semibold mb-1" style={{ color: "var(--fs-text-primary)" }}>{item.label}</p>
                <p className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <p className="fs-label mb-4" style={{ color: "var(--fs-text-secondary)" }}>Network-Triggered Threat Events</p>
        <ThreatFeed />
      </div>
    </PageShell>
  );
}
