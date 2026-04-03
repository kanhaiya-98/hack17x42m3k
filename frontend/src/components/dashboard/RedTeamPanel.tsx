"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { FASTAPI_URL } from "@/lib/supabase";

interface AttackAttempt {
  id: number;
  attackType: string;
  result: "BLOCKED" | "BYPASSED";
  timestamp: string;
  detail: string;
  patchRecommendation?: string;
}

interface PatchRecommendation {
  vulnerability: string;
  severity: "critical" | "high";
  recommendation: string;
  cve: string;
}

const rewardData = [
  0.1, 0.12, 0.15, 0.14, 0.18, 0.22, 0.25, 0.28, 0.31, 0.35,
  0.33, 0.38, 0.42, 0.45, 0.48, 0.52, 0.55, 0.53, 0.58, 0.62,
  0.65, 0.68, 0.72, 0.75, 0.78, 0.82, 0.85, 0.88, 0.91, 0.89,
];

export function RedTeamPanel() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [attacks, setAttacks] = useState<AttackAttempt[]>([]);
  const [showPatch, setShowPatch] = useState(false);
  const [currentPatch, setCurrentPatch] = useState<PatchRecommendation | null>(null);
  const [totalRuns, setTotalRuns] = useState(0);
  const [bypassCount, setBypassCount] = useState(0);
  const [error, setError] = useState(false);
  const attackIdRef = useRef(0);

  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/api/redteam/runs`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!mounted) return;
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const arr: any[] = Array.isArray(data) ? data : [];
        setAttacks(arr.slice(0, 20).map((r: any) => ({
          id: attackIdRef.current++,
          attackType: r.attack_type || r.attackType || "Unknown",
          result: r.result === "BYPASSED" ? "BYPASSED" : "BLOCKED",
          timestamp: r.timestamp || r.created_at || "",
          detail: r.detail || r.description || "",
          patchRecommendation: r.patch_recommendation || "",
        })));
        setTotalRuns(arr.length);
        setBypassCount(arr.filter((r: any) => r.result === "BYPASSED").length);
        setError(false);
      } catch { if (mounted) setError(true); }
    };
    fetchHistory();
    return () => { mounted = false; };
  }, []);

  // Matrix rain — subtle, dark green (not cyan)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const columns = Math.floor(canvas.width / 14);
    const drops: number[] = Array(columns).fill(1);
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネ";
    const draw = () => {
      ctx.fillStyle = "rgba(6, 6, 8, 0.07)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "rgba(0, 220, 130, 0.09)";
      ctx.font = "11px 'JetBrains Mono', monospace";
      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 14, drops[i] * 14);
        if (drops[i] * 14 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
    };
    const interval = setInterval(draw, 55);
    return () => clearInterval(interval);
  }, []);

  // Auto-cycle simulate
  const simulate = useCallback(async () => {
    try {
      const res = await fetch(`${FASTAPI_URL}/api/redteam/simulate`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      const isBypassed = result.result === "BYPASSED";
      const newAttack: AttackAttempt = {
        id: attackIdRef.current++,
        attackType: result.attack_type || result.attackType || "Unknown",
        result: isBypassed ? "BYPASSED" : "BLOCKED",
        timestamp: result.timestamp || new Date().toLocaleTimeString("en-US", { hour12: false }),
        detail: result.detail || result.description || "",
        patchRecommendation: result.patch_recommendation || "",
      };
      setAttacks((prev) => [newAttack, ...prev].slice(0, 20));
      setTotalRuns((r) => r + 1);
      if (isBypassed) {
        setBypassCount((b) => b + 1);
        setCurrentPatch({
          vulnerability: result.attack_type || "Unknown Vulnerability",
          severity: "critical",
          recommendation: result.patch_recommendation || "Review and patch the bypassed defense vector.",
          cve: result.cve || "",
        });
        setShowPatch(true);
        setTimeout(() => setShowPatch(false), 8000);
      }
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    const id = setInterval(simulate, 4000);
    return () => clearInterval(id);
  }, [simulate]);

  const bypassRate = totalRuns > 0 ? ((bypassCount / totalRuns) * 100).toFixed(1) : "0.0";

  // Reward curve SVG
  const renderRewardCurve = () => {
    const w = 280, h = 90;
    const step = w / (rewardData.length - 1);
    const pts = rewardData.map((v, i) => `${i * step},${h - v * h * 0.9}`).join(" ");
    return (
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ minHeight: 90 }}>
        <defs>
          <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(0,220,130,0.25)" />
            <stop offset="100%" stopColor="rgba(0,220,130,0)" />
          </linearGradient>
        </defs>
        <polygon points={`0,${h} ${pts} ${w},${h}`} fill="url(#rg)" />
        <polyline points={pts} fill="none" stroke="var(--fs-green)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx={w} cy={h - rewardData[rewardData.length - 1] * h * 0.9} r="3" fill="var(--fs-green)" />
      </svg>
    );
  };

  return (
    <div className="relative overflow-hidden rounded-xl" style={{ border: "1px solid var(--fs-border)", background: "var(--fs-surface-1)" }}>
      {/* Matrix rain */}
      <canvas ref={canvasRef} className="pointer-events-none absolute inset-0 h-full w-full opacity-100" />

      <div className="relative z-10">
        {/* Header — 28px padding */}
        <div
          className="flex items-center justify-between px-7 py-6"
          style={{ borderBottom: "1px solid var(--fs-border)" }}
        >
          <div className="flex items-center gap-4">
            {/* Icon box — 40px, indigo dim */}
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px]"
              style={{ background: "var(--fs-indigo-dim)", border: "1px solid rgba(99,102,241,0.2)" }}
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--fs-indigo)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3M14.25 3.104c.251.023.501.05.75.082M19.8 15.3l-1.57.393A9.065 9.065 0 0112 15a9.065 9.065 0 00-6.23.693L5 14.5m14.8.8l1.402 1.402c1.232 1.232.65 3.318-1.067 3.611A48.309 48.309 0 0112 21c-2.773 0-5.491-.235-8.135-.687-1.718-.293-2.3-2.379-1.067-3.61L5 14.5" />
              </svg>
            </div>
            <div>
              <p className="text-[14px] font-semibold" style={{ color: "var(--fs-text-primary)" }}>AI Red Team Agent</p>
              <p className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
                Autonomous attack simulation · F8
                {error && <span style={{ color: "var(--fs-amber)", marginLeft: 6 }}>(API offline)</span>}
              </p>
            </div>
          </div>

          {/* Stats — right aligned */}
          <div className="flex items-center gap-8">
            <div className="text-right">
              <p className="tabular text-lg font-bold" style={{ color: "var(--fs-text-primary)" }}>{totalRuns}</p>
              <p className="text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>Total Runs</p>
            </div>
            <div className="text-right">
              <p className="tabular text-lg font-bold" style={{ color: "var(--fs-amber)" }}>{bypassRate}%</p>
              <p className="text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>Bypass Rate</p>
            </div>
            <div className="text-right">
              <div className="flex items-center justify-end gap-1.5">
                <span
                  className="relative flex h-2 w-2"
                >
                  <span className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot" style={{ background: "var(--fs-green)", opacity: 0.5 }} />
                  <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: "var(--fs-green)" }} />
                </span>
                <p className="text-[12px] font-semibold" style={{ color: "var(--fs-green)" }}>Live</p>
              </div>
              <p className="text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>Status</p>
            </div>
          </div>
        </div>

        {/* Hairline divider already handled by border-bottom */}

        {/* Body */}
        <div className="grid grid-cols-1 gap-6 p-7 lg:grid-cols-3">
          {/* Attack Attempts */}
          <div className="lg:col-span-2">
            <p className="fs-label mb-3" style={{ color: "var(--fs-text-secondary)" }}>Attack Attempts</p>
            <div
              className="rounded-lg overflow-hidden"
              style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}
            >
              <div
                className="space-y-0 overflow-y-auto"
                style={{ maxHeight: 300 }}
              >
                <AnimatePresence initial={false}>
                  {attacks.map((attack) => (
                    <motion.div
                      key={attack.id}
                      initial={{ opacity: 0, x: -12, height: 0 }}
                      animate={{ opacity: 1, x: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18 }}
                      className="flex items-center justify-between px-4 py-2.5 transition-colors"
                      style={{ borderBottom: "1px solid var(--fs-border)" }}
                      onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.02)")}
                      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className="font-mono text-[10px] shrink-0" style={{ color: "var(--fs-text-tertiary)" }}>
                          {attack.timestamp}
                        </span>
                        <span className="text-[12px] truncate" style={{ color: "var(--fs-text-secondary)" }}>
                          {attack.attackType}
                        </span>
                      </div>
                      <span
                        className="shrink-0 rounded text-[10px] font-bold uppercase px-2 py-0.5"
                        style={
                          attack.result === "BLOCKED"
                            ? { background: "var(--fs-green-dim)", color: "var(--fs-green)", border: "1px solid rgba(0,220,130,0.25)" }
                            : { background: "var(--fs-red-dim)", color: "var(--fs-red)", border: "1px solid rgba(239,68,68,0.25)" }
                        }
                      >
                        {attack.result}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
                {attacks.length === 0 && (
                  <p className="py-8 text-center text-[12px]" style={{ color: "var(--fs-text-tertiary)"}}>
                    Waiting for agent cycles…
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right: Reward Curve + Patch */}
          <div className="space-y-4">
            <div>
              <p className="fs-label mb-3" style={{ color: "var(--fs-text-secondary)" }}>Reward Curve</p>
              <div className="rounded-lg p-3" style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}>
                {renderRewardCurve()}
                <div className="mt-2 flex items-center justify-between text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>
                  <span>Episode 0</span>
                  <span>Episode {rewardData.length}</span>
                </div>
              </div>
            </div>

            {/* Patch recommendation */}
            <AnimatePresence>
              {showPatch && currentPatch && (
                <motion.div
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.97 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg p-4"
                  style={{
                    background: "var(--fs-amber-dim)",
                    borderLeft: "3px solid var(--fs-amber)",
                    border: "none",
                    borderLeftWidth: 3,
                    borderLeftStyle: "solid",
                    borderLeftColor: "var(--fs-amber)",
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <AlertTriangle size={14} style={{ color: "var(--fs-amber)", flexShrink: 0 }} />
                    <span className="text-[12px] font-bold" style={{ color: "var(--fs-amber)" }}>Patch Required</span>
                    <span
                      className="rounded px-1.5 py-0.5 text-[9px] font-bold uppercase"
                      style={{ background: "var(--fs-red-dim)", color: "var(--fs-red)" }}
                    >
                      {currentPatch.severity}
                    </span>
                  </div>
                  <p className="text-[12px] font-semibold mb-1" style={{ color: "var(--fs-text-primary)" }}>
                    {currentPatch.vulnerability}
                  </p>
                  <p className="text-[11px] leading-relaxed" style={{ color: "var(--fs-text-secondary)" }}>
                    {currentPatch.recommendation}
                  </p>
                  {currentPatch.cve && (
                    <p className="mt-2 font-mono text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>
                      {currentPatch.cve}
                    </p>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {!showPatch && (
              <div
                className="rounded-lg p-4 text-center"
                style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}
              >
                <svg className="mx-auto h-5 w-5 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--fs-green)", opacity: 0.5 }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>All defenses holding</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
