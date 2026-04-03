"use client";

import { useState, useEffect, useRef, useCallback } from "react";

const FASTAPI = "http://localhost:8000";

// ── Fake emails and IPs ─────────────────────────────────────────────────────
const EMAILS = [
  "user847@gmail.com", "rahul.sharma91@yahoo.com", "priya.gupta88@yahoo.com",
  "amit.singh73@gmail.com", "neha.kumar99@hotmail.com", "vikram.mehta21@gmail.com",
  "bot2a8f1c@tempmail.org", "test042@mailinator.com", "user923@gmail.com",
  "deepa.sharma@yahoo.co.in", "arjun.kapoor@gmail.com", "kavya.nair91@gmail.com",
  "rohit.verma@live.com", "pooja.gupta@yahoo.com", "bot7f3e2d@tempmail.org",
  "user381@gmail.com", "user752@gmail.com", "test067@mailinator.com",
  "hacker@protonmail.com", "anonymous@guerrillamail.com",
];

const IP_RANGES = [
  [185, 73, 99], [91, 210, 44], [103, 42, 18],
  [45, 33, 22], [47, 90, 22], [5, 188, 211],
];

function randomIp() {
  const r = IP_RANGES[Math.floor(Math.random() * IP_RANGES.length)];
  return `${r[0]}.${r[1]}.${r[2]}.${Math.floor(Math.random() * 254 + 1)}`;
}

function makeRoboticEvents(sessionId: string) {
  const now = Date.now();
  return Array.from({ length: 20 }, (_, i) => ({
    session_id: sessionId,
    event_type: "keydown",
    timestamp_ms: now + i * 120,
    dwell_ms: 120.0,
    flight_ms: 85.0,
    key_code: "KeyA",
    mouse_x: 0.0,
    mouse_y: 0.0,
    mouse_speed: 0.0,
    scroll_delta: 0.0,
    gyro_alpha: 0.0,
    gyro_beta: 0.0,
    gyro_gamma: 0.0,
  }));
}

interface LogLine {
  id: number;
  ts: string;
  email: string;
  ip: string;
  status: "sending" | "detected" | "in_progress" | "error";
  confidence?: number;
}

let lineId = 0;

export default function DemoPage() {
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<LogLine[]>([]);
  const [stats, setStats] = useState({ total: 0, detected: 0, sessions: 0 });
  const [clock, setClock] = useState("");
  const [fullscreen, setFullscreen] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Clock
  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString("en-IN", { hour12: false }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = 0;
    }
  }, [lines]);

  const addLine = useCallback((email: string, ip: string, status: LogLine["status"], confidence?: number) => {
    const ts = new Date().toLocaleTimeString("en-IN", { hour12: false, fractionalSecondDigits: 2 });
    setLines(prev => [{ id: lineId++, ts, email, ip, status, confidence }, ...prev].slice(0, 80));
  }, []);

  const fireAttack = useCallback(async () => {
    const email = EMAILS[Math.floor(Math.random() * EMAILS.length)];
    const ip = randomIp();

    addLine(email, ip, "sending");
    setStats(s => ({ ...s, total: s.total + 1 }));

    try {
      const sessionRes = await fetch(`${FASTAPI}/api/session/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ip,
          user_agent: "python-requests/2.31.0",
          fingerprint_id: `fp_${Math.random().toString(36).slice(2, 11)}`,
          bank_id: "BANK-A",
        }),
      });

      if (!sessionRes.ok) {
        addLine(email, ip, "error");
        return;
      }

      const { session_id } = await sessionRes.json();
      setStats(s => ({ ...s, sessions: s.sessions + 1 }));

      // Fire biometric events after 200ms
      await new Promise(r => setTimeout(r, 200));
      const bioRes = await fetch(
        `${FASTAPI}/api/biometric/infer?session_id=${session_id}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(makeRoboticEvents(session_id)),
        }
      );

      if (bioRes.ok) {
        const { bot_confidence } = await bioRes.json();
        if (bot_confidence > 0.72) {
          addLine(email, ip, "detected", bot_confidence);
          setStats(s => ({ ...s, detected: s.detected + 1 }));
        } else {
          addLine(email, ip, "in_progress", bot_confidence);
        }
      }
    } catch {
      addLine(email, ip, "error");
    }
  }, [addLine]);

  const startAttack = useCallback(() => {
    setRunning(true);
    setLines([]);
    setStats({ total: 0, detected: 0, sessions: 0 });
    intervalRef.current = setInterval(() => {
      // Fire 3 parallel attempts per tick
      Promise.all([fireAttack(), fireAttack(), fireAttack()]);
    }, 800);
  }, [fireAttack]);

  const stopAttack = useCallback(() => {
    setRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  const reset = useCallback(async () => {
    stopAttack();
    setLines([]);
    setStats({ total: 0, detected: 0, sessions: 0 });
    try {
      await fetch(`${FASTAPI}/api/demo/reset`, { method: "POST" });
    } catch { /* best effort */ }
  }, [stopAttack]);

  const statusColor = (s: LogLine["status"]) => {
    if (s === "detected") return "#EF4444";
    if (s === "in_progress") return "#F59E0B";
    if (s === "sending") return "#64748B";
    return "#94A3B8";
  };

  const statusLabel = (l: LogLine) => {
    if (l.status === "detected") return `⛔ DETECTED  conf=${l.confidence?.toFixed(2)}`;
    if (l.status === "in_progress") return `⏳ IN PROGRESS  conf=${l.confidence?.toFixed(2)}`;
    if (l.status === "sending") return "→ ATTEMPT SENT";
    return "✗ ERROR";
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const C = {
    page: {
      width: "100vw", height: "100vh", overflow: "hidden",
      display: "flex", flexDirection: "column" as const,
      background: "#060608", fontFamily: "'Inter', system-ui, sans-serif",
    },
    cols: { flex: 1, display: "flex", overflow: "hidden" },
    divider: { width: 1, background: "rgba(255,255,255,0.06)", flexShrink: 0 },

    // Left — terminal
    leftCol: { width: "30%", display: "flex", flexDirection: "column" as const, background: "#0A0A0F" },
    termHeader: {
      height: 48, display: "flex", alignItems: "center", justifyContent: "space-between",
      padding: "0 16px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      flexShrink: 0,
    },
    termBody: { flex: 1, overflowY: "auto" as const, padding: "8px 0" },
    termLine: { padding: "2px 16px", display: "grid", gridTemplateColumns: "80px 1fr 100px 1fr", gap: 8, alignItems: "center" },

    // Middle — ZeroBank iframe
    midCol: { width: "40%", display: "flex", flexDirection: "column" as const, background: "#0A0A0F" },
    browserChrome: {
      height: 40, background: "#1A1A2E", display: "flex", alignItems: "center",
      padding: "0 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)",
      flexShrink: 0,
    },
    urlBar: {
      flex: 1, height: 26, background: "rgba(255,255,255,0.05)", borderRadius: 6,
      display: "flex", alignItems: "center", gap: 6, padding: "0 10px",
      border: "1px solid rgba(255,255,255,0.08)",
    },

    // Right — FinShield iframe
    rightCol: { width: "30%", display: "flex", flexDirection: "column" as const, background: "#060608" },
    dashHeader: {
      height: 40, background: "#0D0E14", display: "flex", alignItems: "center",
      padding: "0 12px", gap: 8, borderBottom: "1px solid rgba(255,255,255,0.06)",
      flexShrink: 0,
    },

    // Bottom bar
    bar: {
      height: 44, background: "#0D0E14", borderTop: "1px solid rgba(255,255,255,0.06)",
      display: "flex", alignItems: "center", padding: "0 20px", gap: 16,
      flexShrink: 0,
    },
    barBtn: (color: string, bg: string) => ({
      height: 30, padding: "0 14px", borderRadius: 6, border: `1px solid ${color}33`,
      background: bg, color: color, fontSize: 12, fontWeight: 600,
      cursor: "pointer", letterSpacing: "0.02em",
    }),
  };

  return (
    <div style={C.page}>
      <div style={C.cols}>

        {/* ── LEFT: Attack Terminal ─────────────────────────────────── */}
        <div style={C.leftCol}>
          <div style={C.termHeader}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontFamily: "monospace", fontSize: 11, fontWeight: 700, color: "#EF4444", letterSpacing: "0.1em" }}>
                ATTACK SIMULATION
              </span>
              <span style={{
                display: "flex", alignItems: "center", gap: 4,
                background: running ? "#EF444420" : "#33333320",
                border: `1px solid ${running ? "#EF4444" : "#555"}44`,
                borderRadius: 4, padding: "2px 8px", fontSize: 10, fontWeight: 700,
                color: running ? "#EF4444" : "#555", letterSpacing: "0.06em",
              }}>
                <span style={{
                  width: 6, height: 6, borderRadius: "50%",
                  background: running ? "#EF4444" : "#555",
                  animation: running ? "pulse 1.5s infinite" : "none",
                }} />
                {running ? "RUNNING" : "IDLE"}
              </span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {!running ? (
                <button onClick={startAttack} style={C.barBtn("#EF4444", "#EF444415")}>▶ Start</button>
              ) : (
                <button onClick={stopAttack} style={C.barBtn("#F59E0B", "#F59E0B15")}>■ Stop</button>
              )}
            </div>
          </div>

          {/* Stat strip */}
          <div style={{
            display: "flex", gap: 0, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0,
          }}>
            {[
              { label: "ATTEMPTS", value: stats.total, color: "#64748B" },
              { label: "SESSIONS", value: stats.sessions, color: "#6366F1" },
              { label: "DETECTED", value: stats.detected, color: "#EF4444" },
            ].map((s, i) => (
              <div key={s.label} style={{
                flex: 1, padding: "10px 16px",
                borderRight: i < 2 ? "1px solid rgba(255,255,255,0.06)" : "none",
              }}>
                <p style={{ fontSize: 9, letterSpacing: "0.1em", color: "#334155", marginBottom: 2 }}>{s.label}</p>
                <p style={{ fontSize: 20, fontWeight: 700, fontVariantNumeric: "tabular-nums", color: s.color }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Terminal log */}
          <div ref={terminalRef} style={C.termBody}>
            {lines.length === 0 && (
              <div style={{ padding: "24px 16px", fontFamily: "monospace", fontSize: 11, color: "#334155" }}>
                <p>$ python demo/attack_sim.py --threads 5 --mode burst</p>
                <p style={{ marginTop: 8, color: "#3D4F6B" }}>Waiting for attack simulation to start...</p>
                <p style={{ marginTop: 4, color: "#3D4F6B" }}>Click ▶ Start to begin.</p>
              </div>
            )}
            {lines.map(line => (
              <div
                key={line.id}
                style={{
                  padding: "3px 16px",
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  display: "grid",
                  gridTemplateColumns: "60px 140px 1fr",
                  gap: 8,
                  borderBottom: "1px solid rgba(255,255,255,0.02)",
                  background: line.status === "detected" ? "rgba(239,68,68,0.04)" : "transparent",
                }}
              >
                <span style={{ color: "#334155" }}>{line.ts}</span>
                <span style={{ color: "#6366F1", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {line.email.slice(0, 20)}
                </span>
                <span style={{ color: statusColor(line.status) }}>{statusLabel(line)}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={C.divider} />

        {/* ── MIDDLE: ZeroBank iframe ───────────────────────────────── */}
        <div style={C.midCol}>
          <div style={C.browserChrome}>
            <div style={{ display: "flex", gap: 5 }}>
              {["#FF5F57", "#FFBD2E", "#28C840"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={C.urlBar}>
              <svg width="10" height="10" fill="none" viewBox="0 0 24 24" stroke="#10B981" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
              </svg>
              <span style={{ fontSize: 11, color: "#64748B", fontFamily: "monospace" }}>zerobank.in</span>
            </div>
          </div>
          <iframe
            src="/bank"
            style={{ flex: 1, border: "none", width: "100%", background: "#FFFFFF" }}
            title="ZeroBank — Target Application"
          />
        </div>

        <div style={C.divider} />

        {/* ── RIGHT: FinShield iframe ───────────────────────────────── */}
        <div style={C.rightCol}>
          <div style={C.dashHeader}>
            <div style={{ width: 20, height: 20, background: "rgba(0,220,130,0.15)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <svg width="11" height="11" fill="none" viewBox="0 0 24 24" stroke="#00DC82" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: "#F1F5F9", letterSpacing: "-0.01em" }}>
              Fin<span style={{ color: "#00DC82" }}>Shield</span> AI
            </span>
            <span style={{
              display: "flex", alignItems: "center", gap: 4, marginLeft: "auto",
              background: "rgba(0,220,130,0.1)", border: "1px solid rgba(0,220,130,0.2)",
              borderRadius: 4, padding: "2px 8px", fontSize: 9, fontWeight: 700,
              color: "#00DC82", letterSpacing: "0.08em",
            }}>
              <span style={{ width: 5, height: 5, borderRadius: "50%", background: "#00DC82", animation: "pulse 1.5s infinite" }} />
              LIVE MONITORING
            </span>
          </div>
          <iframe
            src="/dashboard"
            style={{ flex: 1, border: "none", width: "100%", background: "#060608" }}
            title="FinShield AI Dashboard"
          />
        </div>
      </div>

      {/* ── BOTTOM CONTROL BAR ────────────────────────────────────────── */}
      <div style={C.bar}>
        {/* Left */}
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 24, height: 24, background: "rgba(0,220,130,0.12)", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="13" height="13" fill="none" viewBox="0 0 24 24" stroke="#00DC82" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
            </svg>
          </div>
          <span style={{ fontSize: 12, fontWeight: 700, color: "#F1F5F9" }}>
            Fin<span style={{ color: "#00DC82" }}>Shield</span> AI
          </span>
          <span style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 4, padding: "2px 7px", fontSize: 9, fontWeight: 700,
            color: "#EF4444", letterSpacing: "0.08em",
          }}>
            DEMO MODE
          </span>
        </div>

        {/* Center buttons */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", gap: 8 }}>
          <button onClick={startAttack} disabled={running} style={C.barBtn("#EF4444", "#EF444415")}>
            ▶ Start Attack
          </button>
          <button onClick={stopAttack} disabled={!running} style={C.barBtn("#F59E0B", "#F59E0B15")}>
            ■ Stop Attack
          </button>
          <button onClick={reset} style={C.barBtn("#6366F1", "#6366F115")}>
            ↺ Reset
          </button>
        </div>

        {/* Right */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span style={{ fontFamily: "monospace", fontSize: 12, color: "#00DC82", fontVariantNumeric: "tabular-nums" }}>
            {clock}
          </span>
          <button
            onClick={() => {
              if (!document.fullscreenElement) document.documentElement.requestFullscreen();
              else document.exitFullscreen();
              setFullscreen(!fullscreen);
            }}
            style={C.barBtn("#64748B", "rgba(255,255,255,0.04)")}
          >
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.3; }
        }
        iframe { display: block; }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 3px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
      `}</style>
    </div>
  );
}
