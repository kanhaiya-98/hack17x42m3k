"use client";

/**
 * FinShield AI — 3-Panel Live Attack Demo
 * ─────────────────────────────────────────────────────────────────────────
 * Panel 1 (LEFT)   — Attacker Terminal
 *   Fires UPI fraud transactions: APP Fraud, Money Mule, Transaction Smurfing
 *   Shows each transaction in real time with emoji indicators
 *
 * Panel 2 (MIDDLE) — ZeroBank (victim bank)
 *   Live iframe of /bank/transfer
 *   Shows a victim completing a transfer that gets intercepted mid-way
 *
 * Panel 3 (RIGHT)  — FinShield Dashboard
 *   Live iframe of /dashboard
 *   Transaction Risk Feed updates in real time as attacks fire
 *   Shows GNN risk scores, attack labels, Freeze Account actions
 *
 * URL: http://localhost:3000/demo
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const FASTAPI = process.env.NEXT_PUBLIC_FASTAPI_URL || "http://localhost:8000";

// ── Attack scenarios ──────────────────────────────────────────────────────────

interface AttackLog {
  id: number;
  ts: string;
  scenario: "app_fraud" | "mule_ring" | "smurfing" | "benign";
  from: string;
  to: string;
  amount: number;
  status: "firing" | "blocked" | "mfa" | "honeypot" | "monitoring" | "approved" | "error";
  riskScore?: number;
  classification?: string;
  action?: string;
  ringId?: string;
}

const SCENARIO_CFG = {
  app_fraud: {
    label: "APP Fraud",
    emoji: "🎣",
    color: "#EF4444",
    dim: "rgba(239,68,68,0.12)",
    desc: "Victim tricked into ₹1L+ push payment",
    amountRange: [75_000, 500_000] as [number, number],
    isNewBeneficiary: true,
    beneficiaryAgeDays: [5, 25] as [number, number],
    hubSpokeScore: [0.65, 0.92] as [number, number],
    newBeneFreq: [0.82, 0.98] as [number, number],
    purpose: ["Investment", "Emergency", "Business opportunity", "Loan repayment"],
  },
  mule_ring: {
    label: "Money Mule",
    emoji: "🔄",
    color: "#A855F7",
    dim: "rgba(168,85,247,0.12)",
    desc: "Hub-and-spoke ring funneling to exit wallet",
    amountRange: [30_000, 85_000] as [number, number],
    isNewBeneficiary: true,
    beneficiaryAgeDays: [8, 28] as [number, number],
    hubSpokeScore: [0.72, 0.95] as [number, number],
    newBeneFreq: [0.85, 0.99] as [number, number],
    purpose: ["Personal"],
  },
  smurfing: {
    label: "Smurfing",
    emoji: "🪄",
    color: "#F59E0B",
    dim: "rgba(245,158,11,0.12)",
    desc: "60× sub-₹10k below RBI threshold",
    amountRange: [7_200, 9_800] as [number, number],
    isNewBeneficiary: false,
    beneficiaryAgeDays: [60, 120] as [number, number],
    hubSpokeScore: [0.30, 0.55] as [number, number],
    newBeneFreq: [0.10, 0.30] as [number, number],
    purpose: ["Personal"],
  },
  benign: {
    label: "Benign",
    emoji: "✅",
    color: "#10B981",
    dim: "rgba(16,185,129,0.08)",
    desc: "Normal UPI transfer",
    amountRange: [500, 15_000] as [number, number],
    isNewBeneficiary: false,
    beneficiaryAgeDays: [300, 1500] as [number, number],
    hubSpokeScore: [0.02, 0.15] as [number, number],
    newBeneFreq: [0.05, 0.20] as [number, number],
    purpose: ["Rent", "Groceries", "Personal", "Utilities"],
  },
};

const BANK_PREFIXES = ["HDFC", "ICIC", "SBIN", "UTIB", "KKBK", "BARB"];
const rand = (min: number, max: number) => Math.random() * (max - min) + min;
const randInt = (min: number, max: number) => Math.floor(rand(min, max));
const randAccount = () => `${BANK_PREFIXES[randInt(0, BANK_PREFIXES.length)]}${randInt(10000000, 99999999)}`;

// Mule ring exit wallet — stays same so it accumulates risk
const EXIT_WALLET = `SBIN${randInt(10000000, 99999999)}`;

let logId = 0;

const ACTION_DISPLAY: Record<string, { icon: string; label: string; color: string }> = {
  freeze_transfer: { icon: "❌", label: "FROZEN",     color: "#EF4444" },
  step_up_mfa:    { icon: "🔐", label: "MFA REQ'd",  color: "#F59E0B" },
  honeypot_escrow:{ icon: "🪤", label: "HONEYPOT",   color: "#A855F7" },
  flag_reversal:  { icon: "↩",  label: "REVERSAL",   color: "#EA580C" },
  alert_compliance:{ icon: "⚠", label: "MONITORING", color: "#6366F1" },
  approve:        { icon: "✅", label: "APPROVED",   color: "#10B981" },
};

function formatAmount(n: number) {
  if (n >= 100_000) return `₹${(n / 100_000).toFixed(1)}L`;
  if (n >= 1_000)   return `₹${(n / 1_000).toFixed(1)}k`;
  return `₹${n.toLocaleString("en-IN")}`;
}

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [logs, setLogs] = useState<AttackLog[]>([]);
  const [stats, setStats] = useState({ total: 0, blocked: 0, mfa: 0, honeypot: 0, approved: 0 });
  const [activeScenario, setActiveScenario] = useState<"all" | "app_fraud" | "mule_ring" | "smurfing">("all");
  const [speed, setSpeed] = useState(1800); // ms between attacks
  const [clock, setClock] = useState("");
  const [apiStatus, setApiStatus] = useState<"checking" | "ok" | "error">("checking");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const logsRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // API health check
  useEffect(() => {
    fetch(`${FASTAPI}/health`, { signal: AbortSignal.timeout(3000) })
      .then(r => setApiStatus(r.ok ? "ok" : "error"))
      .catch(() => setApiStatus("error"));
  }, []);

  // Auto-scroll logs
  useEffect(() => {
    if (logsRef.current) logsRef.current.scrollTop = 0;
  }, [logs]);

  const pickScenario = useCallback((): keyof typeof SCENARIO_CFG => {
    if (activeScenario !== "all") return activeScenario;
    const weights = [0.35, 0.30, 0.20, 0.15]; // APP Fraud, Mule, Smurfing, Benign
    const rand = Math.random();
    if (rand < weights[0]) return "app_fraud";
    if (rand < weights[0] + weights[1]) return "mule_ring";
    if (rand < weights[0] + weights[1] + weights[2]) return "smurfing";
    return "benign";
  }, [activeScenario]);

  const fireAttack = useCallback(async () => {
    const scenarioKey = pickScenario();
    const cfg = SCENARIO_CFG[scenarioKey];
    const from = randAccount();
    const to = scenarioKey === "mule_ring" ? EXIT_WALLET : randAccount();
    const amount = Math.round(rand(cfg.amountRange[0], cfg.amountRange[1]));
    const txnId = `TXN-${Date.now().toString(36).slice(-6).toUpperCase()}`;
    const purpose = cfg.purpose[randInt(0, cfg.purpose.length)];

    const entry: AttackLog = {
      id: logId++,
      ts: new Date().toLocaleTimeString("en-IN", { hour12: false, fractionalSecondDigits: 1 }),
      scenario: scenarioKey,
      from,
      to,
      amount,
      status: "firing",
      ringId: scenarioKey === "mule_ring" ? "RING-LIVE" : undefined,
    };
    setLogs(prev => [entry, ...prev].slice(0, 60));
    setStats(s => ({ ...s, total: s.total + 1 }));

    try {
      // Fire triage + GNN simultaneously
      const [triageRes, gnnRes] = await Promise.allSettled([
        fetch(`${FASTAPI}/api/triage/analyze`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            transaction_id: txnId,
            amount,
            channel: "UPI",
            sender_account_age_days: randInt(300, 1500),
            beneficiary_account_age_days: randInt(cfg.beneficiaryAgeDays[0], cfg.beneficiaryAgeDays[1]),
            frequency_of_new_beneficiaries: parseFloat(rand(cfg.newBeneFreq[0], cfg.newBeneFreq[1]).toFixed(2)),
            is_new_beneficiary: cfg.isNewBeneficiary,
            recent_transfers_to_same_beneficiary: scenarioKey === "smurfing" ? randInt(5, 15) : 0,
            hub_spoke_score: parseFloat(rand(cfg.hubSpokeScore[0], cfg.hubSpokeScore[1]).toFixed(2)),
            purpose,
          }),
        }),
        fetch(`${FASTAPI}/api/gnn/process_transaction`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ from_account: from, to_account: to, amount, currency: "INR", channel: "UPI" }),
        }),
      ]);

      let classification = cfg.label;
      let action = "approve";
      let riskScore = 0.1;

      if (triageRes.status === "fulfilled" && triageRes.value.ok) {
        const t = await triageRes.value.json();
        classification = t.fraud_classification || classification;
        action = t.transaction_action || action;
        riskScore = t.risk_score ?? t.confidence ?? riskScore;
      }
      if (gnnRes.status === "fulfilled" && gnnRes.value.ok) {
        const g = await gnnRes.value.json();
        if (g.gnn_risk_score) riskScore = Math.max(riskScore, g.gnn_risk_score);
      }

      const uiStatus: AttackLog["status"] =
        action === "freeze_transfer"    ? "blocked"    :
        action === "step_up_mfa"        ? "mfa"        :
        action === "honeypot_escrow"    ? "honeypot"   :
        action === "alert_compliance"   ? "monitoring" :
        action === "flag_reversal"      ? "blocked"    : "approved";

      setStats(s => ({
        ...s,
        blocked:   s.blocked   + (uiStatus === "blocked"    ? 1 : 0),
        mfa:       s.mfa       + (uiStatus === "mfa"        ? 1 : 0),
        honeypot:  s.honeypot  + (uiStatus === "honeypot"   ? 1 : 0),
        approved:  s.approved  + (uiStatus === "approved"   ? 1 : 0),
      }));

      setLogs(prev => prev.map(l => l.id === entry.id ? {
        ...l, status: uiStatus, riskScore, classification, action,
        ringId: action === "freeze_transfer" && scenarioKey === "mule_ring" ? "RING-LIVE" : l.ringId,
      } : l));

    } catch {
      setLogs(prev => prev.map(l => l.id === entry.id ? { ...l, status: "error" } : l));
    }
  }, [pickScenario]);

  const startAttack = useCallback(async () => {
    setRunning(true);
    setLogs([]);
    setStats({ total: 0, blocked: 0, mfa: 0, honeypot: 0, approved: 0 });
    // Seed demo data in GNN
    try { await fetch(`${FASTAPI}/api/gnn/seed_demo`, { method: "POST" }); } catch { /* */ }
    intervalRef.current = setInterval(() => { fireAttack(); }, speed);
  }, [fireAttack, speed]);

  const stopAttack = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const reset = useCallback(() => {
    stopAttack();
    setLogs([]);
    setStats({ total: 0, blocked: 0, mfa: 0, honeypot: 0, approved: 0 });
  }, [stopAttack]);

  // Restart interval when speed changes
  useEffect(() => {
    if (running && intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = setInterval(() => { fireAttack(); }, speed);
    }
  }, [speed, running, fireAttack]);

  const interceptions = stats.blocked + stats.mfa + stats.honeypot;
  const interceptionRate = stats.total > 0 ? Math.round((interceptions / stats.total) * 100) : 0;

  return (
    <div style={{ width: "100vw", height: "100vh", overflow: "hidden", display: "flex", flexDirection: "column", background: "#060608", fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── TOP BAR ──────────────────────────────────────────────────────── */}
      <div style={{ height: 48, background: "#0A0B10", borderBottom: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "0 20px", gap: 16, flexShrink: 0 }}>
        {/* Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 22, height: 22, background: "rgba(0,220,130,0.15)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#00DC82" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#F1F5F9" }}>
            Fin<span style={{ color: "#00DC82" }}>Shield</span>
            <span style={{ fontSize: 10, fontWeight: 500, color: "#64748B", marginLeft: 6 }}>Live Transaction Attack Demo</span>
          </span>
        </div>

        {/* API Status */}
        <div style={{ display: "flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 5, background: apiStatus === "ok" ? "rgba(0,220,130,0.08)" : "rgba(239,68,68,0.08)", border: `1px solid ${apiStatus === "ok" ? "rgba(0,220,130,0.2)" : "rgba(239,68,68,0.2)"}` }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", background: apiStatus === "ok" ? "#00DC82" : "#EF4444", display: "inline-block" }} />
          <span style={{ fontSize: 10, fontWeight: 600, color: apiStatus === "ok" ? "#00DC82" : "#EF4444" }}>
            {apiStatus === "checking" ? "Connecting…" : apiStatus === "ok" ? "FastAPI Online" : "FastAPI Offline"}
          </span>
        </div>

        {/* Scenario selector */}
        <div style={{ display: "flex", gap: 4 }}>
          {(["all", "app_fraud", "mule_ring", "smurfing"] as const).map(s => (
            <button
              key={s}
              onClick={() => setActiveScenario(s)}
              style={{
                height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid",
                fontSize: 10, fontWeight: 600, cursor: "pointer", letterSpacing: "0.03em",
                borderColor: activeScenario === s ? (s === "all" ? "#6366F1" : s === "app_fraud" ? "#EF4444" : s === "mule_ring" ? "#A855F7" : "#F59E0B") : "rgba(255,255,255,0.08)",
                background: activeScenario === s ? (s === "all" ? "rgba(99,102,241,0.15)" : s === "app_fraud" ? "rgba(239,68,68,0.15)" : s === "mule_ring" ? "rgba(168,85,247,0.15)" : "rgba(245,158,11,0.15)") : "transparent",
                color: activeScenario === s ? "#F1F5F9" : "#64748B",
              }}
            >
              {s === "all" ? "All Scenarios" : SCENARIO_CFG[s].emoji + " " + SCENARIO_CFG[s].label}
            </button>
          ))}
        </div>

        {/* Speed */}
        <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto" }}>
          <span style={{ fontSize: 9, color: "#475569", letterSpacing: "0.08em" }}>SPEED</span>
          {[{ label: "Slow", ms: 3000 }, { label: "Normal", ms: 1800 }, { label: "Fast", ms: 800 }].map(sp => (
            <button key={sp.ms} onClick={() => setSpeed(sp.ms)} style={{ height: 22, padding: "0 8px", borderRadius: 4, border: `1px solid ${speed === sp.ms ? "#6366F1" : "rgba(255,255,255,0.08)"}`, background: speed === sp.ms ? "rgba(99,102,241,0.15)" : "transparent", color: speed === sp.ms ? "#A5B4FC" : "#475569", fontSize: 9, fontWeight: 600, cursor: "pointer" }}>{sp.label}</button>
          ))}
        </div>

        {/* Clock */}
        <span style={{ fontFamily: "monospace", fontSize: 12, color: "#00DC82", fontVariantNumeric: "tabular-nums" }}>{clock}</span>

        {/* Fullscreen */}
        <button onClick={() => { if (!document.fullscreenElement) document.documentElement.requestFullscreen(); else document.exitFullscreen(); }} style={{ height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#475569", fontSize: 10, cursor: "pointer" }}>⛶</button>
      </div>

      {/* ── 3 PANELS ─────────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>

        {/* ════════════════════════════════════════════════════════════════
            PANEL 1 — ATTACKER TERMINAL
            ════════════════════════════════════════════════════════════════ */}
        <div style={{ width: "30%", display: "flex", flexDirection: "column", background: "#0A0B10", borderRight: "1px solid rgba(255,255,255,0.06)" }}>

          {/* Panel header */}
          <div style={{ padding: "10px 16px", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 10, fontWeight: 700, color: "#EF4444", letterSpacing: "0.12em" }}>ATTACKER TOOL</span>
              <span style={{ fontSize: 9, color: "#334155" }}>fraud_sim.py</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 7px", borderRadius: 4, background: running ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)", border: `1px solid ${running ? "rgba(239,68,68,0.3)" : "rgba(255,255,255,0.08)"}` }}>
                <span style={{ width: 5, height: 5, borderRadius: "50%", background: running ? "#EF4444" : "#334155", animation: running ? "pulse 1s infinite" : "none" }} />
                <span style={{ fontSize: 9, fontWeight: 700, color: running ? "#EF4444" : "#334155", letterSpacing: "0.06em" }}>{running ? "RUNNING" : "IDLE"}</span>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {!running
                ? <button onClick={startAttack} style={{ height: 26, padding: "0 12px", borderRadius: 5, border: "1px solid rgba(239,68,68,0.4)", background: "rgba(239,68,68,0.12)", color: "#EF4444", fontSize: 10, fontWeight: 700, cursor: "pointer", letterSpacing: "0.04em" }}>▶ START ATTACK</button>
                : <button onClick={stopAttack} style={{ height: 26, padding: "0 12px", borderRadius: 5, border: "1px solid rgba(245,158,11,0.4)", background: "rgba(245,158,11,0.12)", color: "#F59E0B", fontSize: 10, fontWeight: 700, cursor: "pointer" }}>■ STOP</button>
              }
              <button onClick={reset} style={{ height: 26, padding: "0 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,0.08)", background: "transparent", color: "#475569", fontSize: 10, cursor: "pointer" }}>↺</button>
            </div>
          </div>

          {/* Stats strip */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            {[
              { label: "FIRED", value: stats.total, color: "#64748B" },
              { label: "FROZEN", value: stats.blocked, color: "#EF4444" },
              { label: "MFA", value: stats.mfa, color: "#F59E0B" },
              { label: "RATE", value: `${interceptionRate}%`, color: "#00DC82" },
            ].map((s, i) => (
              <div key={s.label} style={{ padding: "10px 12px", borderRight: i < 3 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                <p style={{ fontSize: 8, letterSpacing: "0.1em", color: "#1E293B", marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 18, fontWeight: 700, color: s.color, fontVariantNumeric: "tabular-nums" }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Scenario legend */}
          <div style={{ display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.04)", flexShrink: 0 }}>
            {(["app_fraud", "mule_ring", "smurfing"] as const).map((k, i) => {
              const c = SCENARIO_CFG[k];
              return (
                <div key={k} style={{ flex: 1, padding: "6px 10px", borderRight: i < 2 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <p style={{ fontSize: 9, color: c.color, fontWeight: 700 }}>{c.emoji} {c.label}</p>
                  <p style={{ fontSize: 8, color: "#334155", lineHeight: 1.4, marginTop: 1 }}>{c.desc}</p>
                </div>
              );
            })}
          </div>

          {/* Live log */}
          <div ref={logsRef} style={{ flex: 1, overflowY: "auto", padding: "4px 0" }}>
            {logs.length === 0 && (
              <div style={{ padding: "20px 16px", fontFamily: "monospace" }}>
                <p style={{ fontSize: 10, color: "#1E293B" }}>$ python demo/fraud_sim.py --scenario all</p>
                <p style={{ fontSize: 10, color: "#1E293B", marginTop: 6 }}>Targeting: ZeroBank UPI Transaction API</p>
                <p style={{ fontSize: 10, color: "#0F172A", marginTop: 4 }}>Press ▶ START ATTACK to begin...</p>
              </div>
            )}
            <AnimatePresence initial={false}>
              {logs.map(log => {
                const cfg = SCENARIO_CFG[log.scenario];
                const actionDisp = log.action ? (ACTION_DISPLAY[log.action] ?? null) : null;
                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.15 }}
                    style={{
                      padding: "4px 14px",
                      fontFamily: "'JetBrains Mono', monospace",
                      fontSize: 9.5,
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      borderBottom: "1px solid rgba(255,255,255,0.025)",
                      background: log.status === "blocked" ? "rgba(239,68,68,0.04)" : log.status === "mfa" ? "rgba(245,158,11,0.03)" : "transparent",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <span style={{ color: "#1E293B", minWidth: 64 }}>{log.ts}</span>
                      <span style={{ color: cfg.color, fontWeight: 700 }}>{cfg.emoji} {cfg.label}</span>
                      <span style={{ color: "#334155", marginLeft: "auto" }}>{formatAmount(log.amount)}</span>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, paddingLeft: 70 }}>
                      <span style={{ color: "#1E293B" }}>{log.from.slice(0, 8)}…→{log.to.slice(0, 8)}…</span>
                      {log.status === "firing"
                        ? <span style={{ color: "#334155" }}>⟳ analyzing…</span>
                        : actionDisp
                          ? <span style={{ color: actionDisp.color, fontWeight: 700 }}>{actionDisp.icon} {actionDisp.label}</span>
                          : <span style={{ color: "#EF4444" }}>✗ error</span>
                      }
                      {log.riskScore !== undefined && (
                        <span style={{ color: log.riskScore > 0.7 ? "#EF4444" : log.riskScore > 0.45 ? "#F59E0B" : "#10B981", marginLeft: "auto" }}>
                          {(log.riskScore * 100).toFixed(0)}%
                        </span>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PANEL 2 — ZEROBANK (Victim Bank)
            ════════════════════════════════════════════════════════════════ */}
        <div style={{ width: "35%", display: "flex", flexDirection: "column", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
          {/* Browser chrome */}
          <div style={{ height: 40, background: "#12131A", display: "flex", alignItems: "center", padding: "0 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#FF5F57", "#FFBD2E", "#28C840"].map(c => (
                <div key={c} style={{ width: 9, height: 9, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{ flex: 1, height: 24, background: "rgba(255,255,255,0.04)", borderRadius: 5, display: "flex", alignItems: "center", gap: 6, padding: "0 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span style={{ fontSize: 10, color: "#475569", fontFamily: "monospace" }}>zerobank.in/transfer</span>
            </div>
            <div style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <span style={{ fontSize: 9, color: "#475569", fontWeight: 600 }}>VICTIM BANK</span>
            </div>
          </div>
          <iframe
            src="/bank/transfer"
            style={{ flex: 1, border: "none", width: "100%", background: "#F8FAFC" }}
            title="ZeroBank — Victim Bank Transfer"
          />
        </div>

        {/* ════════════════════════════════════════════════════════════════
            PANEL 3 — FINSHIELD DASHBOARD
            ════════════════════════════════════════════════════════════════ */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Dashboard chrome */}
          <div style={{ height: 40, background: "#0D0E14", display: "flex", alignItems: "center", padding: "0 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 18, height: 18, background: "rgba(0,220,130,0.15)", borderRadius: 5, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="9" height="9" fill="none" viewBox="0 0 24 24" stroke="#00DC82" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span style={{ fontSize: 11, fontWeight: 700, color: "#F1F5F9" }}>Fin<span style={{ color: "#00DC82" }}>Shield</span> AI</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 4, background: "rgba(0,220,130,0.08)", border: "1px solid rgba(0,220,130,0.2)" }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00DC82", animation: "pulse 1.5s infinite", display: "inline-block" }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: "#00DC82", letterSpacing: "0.08em" }}>LIVE MONITORING</span>
            </div>
            <span style={{ marginLeft: "auto", fontSize: 9, color: "#1E293B" }}>Transaction Intelligence Hub</span>
          </div>
          <iframe
            src="/dashboard"
            style={{ flex: 1, border: "none", width: "100%", background: "#060608" }}
            title="FinShield AI Dashboard"
          />
        </div>
      </div>

      {/* ── BOTTOM STATUS BAR ──────────────────────────────────────────────── */}
      <div style={{ height: 40, background: "#0A0B10", borderTop: "1px solid rgba(255,255,255,0.07)", display: "flex", alignItems: "center", padding: "0 20px", gap: 20, flexShrink: 0 }}>
        {/* Big start/stop */}
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={startAttack} disabled={running} style={{ height: 28, padding: "0 16px", borderRadius: 6, border: "1px solid rgba(239,68,68,0.4)", background: running ? "rgba(255,255,255,0.03)" : "rgba(239,68,68,0.12)", color: running ? "#334155" : "#EF4444", fontSize: 11, fontWeight: 700, cursor: running ? "not-allowed" : "pointer" }}>▶ Start Attack</button>
          <button onClick={stopAttack} disabled={!running} style={{ height: 28, padding: "0 16px", borderRadius: 6, border: "1px solid rgba(245,158,11,0.4)", background: !running ? "rgba(255,255,255,0.03)" : "rgba(245,158,11,0.12)", color: !running ? "#334155" : "#F59E0B", fontSize: 11, fontWeight: 700, cursor: !running ? "not-allowed" : "pointer" }}>■ Stop</button>
          <button onClick={reset} style={{ height: 28, padding: "0 14px", borderRadius: 6, border: "1px solid rgba(99,102,241,0.3)", background: "rgba(99,102,241,0.08)", color: "#818CF8", fontSize: 11, fontWeight: 700, cursor: "pointer" }}>↺ Reset</button>
        </div>

        {/* Live stats */}
        <div style={{ display: "flex", gap: 16, fontVariantNumeric: "tabular-nums" }}>
          {[
            { label: "fired", value: stats.total, color: "#475569" },
            { label: "frozen", value: stats.blocked, color: "#EF4444" },
            { label: "mfa", value: stats.mfa, color: "#F59E0B" },
            { label: "honeypot", value: stats.honeypot, color: "#A855F7" },
            { label: "approved", value: stats.approved, color: "#10B981" },
            { label: "intercept rate", value: `${interceptionRate}%`, color: "#00DC82" },
          ].map(s => (
            <div key={s.label} style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: s.color }}>{s.value}</span>
              <span style={{ fontSize: 9, color: "#1E293B", letterSpacing: "0.06em" }}>{s.label.toUpperCase()}</span>
            </div>
          ))}
        </div>

        {/* Panel labels */}
        <div style={{ marginLeft: "auto", display: "flex", gap: 16 }}>
          {[
            { panel: "01", label: "Attacker Tool", color: "#EF4444" },
            { panel: "02", label: "Victim Bank", color: "#6366F1" },
            { panel: "03", label: "FinShield SOC", color: "#00DC82" },
          ].map(p => (
            <div key={p.panel} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 9, fontWeight: 700, color: p.color, fontFamily: "monospace" }}>{p.panel}</span>
              <span style={{ fontSize: 9, color: "#334155" }}>{p.label}</span>
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
        iframe { display: block; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.07); border-radius: 99px; }
      `}</style>
    </div>
  );
}
