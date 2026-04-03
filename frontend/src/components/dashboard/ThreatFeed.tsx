"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FASTAPI_URL } from "@/lib/supabase";

const classColors: Record<string, { bg: string; text: string; border: string }> = {
  "Credential Stuffing": { bg: "var(--fs-red-dim)",    text: "var(--fs-red)",    border: "rgba(239,68,68,0.25)" },
  "API Abuse":           { bg: "var(--fs-orange-dim)",  text: "var(--fs-orange)", border: "rgba(249,115,22,0.25)" },
  "Mule Ring":           { bg: "var(--fs-purple-dim)",  text: "var(--fs-purple)", border: "rgba(168,85,247,0.25)" },
  "Benign":              { bg: "var(--fs-green-dim)",   text: "var(--fs-green)",  border: "rgba(0,220,130,0.25)" },
  "Session Hijack":      { bg: "var(--fs-red-dim)",     text: "var(--fs-red)",    border: "rgba(239,68,68,0.25)" },
  "DDoS Probe":          { bg: "var(--fs-amber-dim)",   text: "var(--fs-amber)",  border: "rgba(245,158,11,0.25)" },
};

const riskColors: Record<string, string> = {
  critical: "var(--fs-red)",
  high:     "var(--fs-orange)",
  medium:   "var(--fs-amber)",
  low:      "var(--fs-green)",
};

const actionStyles: Record<string, { bg: string; text: string }> = {
  BLOCK:      { bg: "var(--fs-red-dim)",    text: "var(--fs-red)" },
  CHALLENGE:  { bg: "var(--fs-amber-dim)",  text: "var(--fs-amber)" },
  MONITOR:    { bg: "var(--fs-indigo-dim)", text: "var(--fs-indigo)" },
  ALLOW:      { bg: "var(--fs-green-dim)",  text: "var(--fs-green)" },
  QUARANTINE: { bg: "var(--fs-purple-dim)", text: "var(--fs-purple)" },
  HONEYPOT:   { bg: "var(--fs-amber-dim)",  text: "var(--fs-amber)" },
};

const mitigationToAction: Record<string, string> = {
  block_ip: "BLOCK", honeypot_route: "HONEYPOT", rate_limit: "CHALLENGE",
  force_mfa: "CHALLENGE", terminate_session: "BLOCK", captcha_challenge: "CHALLENGE",
  alert_only: "MONITOR", no_action: "ALLOW",
};

function confidenceToRisk(c: number): "critical" | "high" | "medium" | "low" {
  if (c >= 0.9) return "critical";
  if (c >= 0.75) return "high";
  if (c >= 0.5) return "medium";
  return "low";
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapApiToThreat(item: any, index: number) {
  const confidence = item.confidence ?? item.bot_confidence ?? 0;
  const action = mitigationToAction[item.mitigation_action] || "MONITOR";
  const classification = item.threat_classification || item.classification || "Benign";
  return {
    id: item.session_id || item.id || `THR-${String(index).padStart(3, "0")}`,
    classification,
    confidence,
    risk: confidenceToRisk(confidence),
    reasoning: item.reasoning_summary || item.reasoning || "",
    action,
    timestamp: item.created_at
      ? new Date(item.created_at).toLocaleTimeString("en-US", { hour12: false })
      : new Date().toLocaleTimeString("en-US", { hour12: false }),
  };
}

export function ThreatFeed() {
  const [threats, setThreats] = useState<ReturnType<typeof mapApiToThreat>[]>([]);
  const [triageRunning, setTriageRunning] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchHistory = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/api/triage/history?limit=50`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!mounted) return;
        setThreats((Array.isArray(data) ? data : []).map(mapApiToThreat));
        setError(false);
      } catch { if (mounted) setError(true); }
    };
    fetchHistory();
    return () => { mounted = false; };
  }, []);

  const handleTriage = async () => {
    setTriageRunning(true);
    try {
      const payload = {
        session_id: `sess_${Date.now().toString(36)}`,
        bot_confidence: +(Math.random() * 0.49 + 0.5).toFixed(2),
        clustering_score: +(Math.random() * 0.8 + 0.1).toFixed(2),
        ip_reputation: +Math.random().toFixed(2),
        velocity_flag: Math.random() > 0.5,
        bank_id: "bank-demo",
      };
      const res = await fetch(`${FASTAPI_URL}/api/triage/analyze`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      const result = await res.json();
      setThreats((prev) => [mapApiToThreat(result, Date.now()), ...prev]);
    } catch { /* silent */ } finally { setTriageRunning(false); }
  };

  return (
    <div className="fs-card flex flex-col" style={{ padding: 0 }}>
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-4"
        style={{ borderBottom: "1px solid var(--fs-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "var(--fs-red-dim)", border: "1px solid rgba(239,68,68,0.20)" }}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--fs-red)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m0 3.75h.008M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--fs-text-primary)" }}>
              Threat Feed
            </p>
            <p className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
              Real-time AI classification
              {error && <span style={{ color: "var(--fs-amber)", marginLeft: 6 }}>(API offline)</span>}
            </p>
          </div>
        </div>

        <button
          onClick={handleTriage}
          disabled={triageRunning}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-[12px] font-semibold transition-all active:scale-95"
          style={{
            background: triageRunning ? "var(--fs-surface-2)" : "var(--fs-green-dim)",
            border: `1px solid rgba(0,220,130,${triageRunning ? "0.1" : "0.25"})`,
            color: triageRunning ? "var(--fs-text-tertiary)" : "var(--fs-green)",
          }}
        >
          {triageRunning ? (
            <>
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : "Run AI Triage"}
        </button>
      </div>

      {/* Feed */}
      <div className="overflow-y-auto" style={{ maxHeight: 480 }}>
        <div className="space-y-1.5 p-4">
          <AnimatePresence initial={false}>
            {threats.map((threat) => {
              const cls = classColors[threat.classification] ?? { bg: "rgba(255,255,255,0.04)", text: "var(--fs-text-secondary)", border: "var(--fs-border)" };
              const act = actionStyles[threat.action] ?? { bg: "rgba(255,255,255,0.04)", text: "var(--fs-text-secondary)" };

              return (
                <motion.div
                  key={threat.id}
                  initial={{ opacity: 0, x: -12, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.22 }}
                  className="rounded-lg p-4 transition-colors"
                  style={{
                    background: "var(--fs-surface-2)",
                    border: "1px solid var(--fs-border)",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--fs-border-active)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--fs-border)")}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 space-y-2.5">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className="rounded px-2 py-0.5 text-[11px] font-semibold"
                          style={{ background: cls.bg, color: cls.text, border: `1px solid ${cls.border}` }}
                        >
                          {threat.classification}
                        </span>
                        <span className="text-[11px] font-semibold uppercase" style={{ color: riskColors[threat.risk] }}>
                          {threat.risk}
                        </span>
                        <span className="font-mono text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>
                          {threat.id.slice(-8)}
                        </span>
                      </div>

                      {/* Confidence bar */}
                      <div className="flex items-center gap-2">
                        <div className="fs-progress flex-1">
                          <div
                            className="fs-progress-fill"
                            style={{
                              width: `${threat.confidence * 100}%`,
                              background: threat.confidence > 0.85
                                ? "var(--fs-red)"
                                : threat.confidence > 0.7
                                ? "var(--fs-amber)"
                                : "var(--fs-green)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[11px] tabular" style={{ color: "var(--fs-text-tertiary)" }}>
                          {(threat.confidence * 100).toFixed(1)}%
                        </span>
                      </div>

                      {threat.reasoning && (
                        <p className="text-[12px] leading-relaxed" style={{ color: "var(--fs-text-secondary)" }}>
                          {threat.reasoning}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      <span
                        className="fs-badge"
                        style={{ background: act.bg, color: act.text, border: `1px solid ${act.text}33` }}
                      >
                        {threat.action}
                      </span>
                      <span className="font-mono text-[10px] tabular" style={{ color: "var(--fs-text-tertiary)" }}>
                        {threat.timestamp}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>

          {threats.length === 0 && !error && (
            <p className="py-10 text-center text-[12px]" style={{ color: "var(--fs-text-tertiary)" }}>
              No threats yet. Click &ldquo;Run AI Triage&rdquo; to analyze a session.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
