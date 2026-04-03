"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { FASTAPI_URL } from "@/lib/supabase";

interface Session {
  id: string;
  ip: string;
  botConfidence: number;
  status: "active" | "flagged" | "blocked" | "verified";
  country: string;
  duration: string;
}

const statusStyles: Record<string, { bg: string; text: string; border: string }> = {
  active:   { bg: "var(--fs-green-dim)",   text: "var(--fs-green)",  border: "rgba(0,220,130,0.2)" },
  flagged:  { bg: "var(--fs-amber-dim)",   text: "var(--fs-amber)",  border: "rgba(245,158,11,0.2)" },
  blocked:  { bg: "var(--fs-red-dim)",     text: "var(--fs-red)",    border: "rgba(239,68,68,0.2)" },
  verified: { bg: "var(--fs-green-dim)",   text: "var(--fs-green)",  border: "rgba(0,220,130,0.2)" },
};

function botScoreToStatus(score: number): Session["status"] {
  if (score > 0.72) return "blocked";
  if (score >= 0.4) return "flagged";
  if (score >= 0.15) return "active";
  return "verified";
}

function getBarColor(c: number): string {
  if (c > 0.72) return "var(--fs-red)";
  if (c >= 0.4) return "var(--fs-amber)";
  return "var(--fs-green)";
}

export function SessionMonitor() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [error, setError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const fetchSessions = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/api/network/graph`);
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!mounted) return;
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const nodes: any[] = Array.isArray(data?.nodes) ? data.nodes : [];
        setSessions(nodes.map((n: any) => ({
          id: n.id || n.session_id || "unknown",
          ip: n.ip || "0.0.0.0",
          botConfidence: n.bot_score ?? n.bot_confidence ?? 0,
          status: botScoreToStatus(n.bot_score ?? n.bot_confidence ?? 0),
          country: n.geo || n.country || "--",
          duration: n.duration || "--",
        })));
        setError(false);
      } catch { if (mounted) setError(true); }
    };
    fetchSessions();
    const id = setInterval(fetchSessions, 3000);
    return () => { mounted = false; clearInterval(id); };
  }, []);

  return (
    <div className="fs-card flex flex-col" style={{ padding: 0 }}>
      {/* Header */}
      <div
        className="flex items-center gap-3 px-6 py-4"
        style={{ borderBottom: "1px solid var(--fs-border)" }}
      >
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: "var(--fs-green-dim)", border: "1px solid rgba(0,220,130,0.2)" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--fs-green)" }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M7.864 4.243A7.5 7.5 0 0119.5 10.5c0 2.92-.556 5.709-1.568 8.268M5.742 6.364A7.465 7.465 0 004.5 10.5a48.667 48.667 0 00-1.26 7.584m16.018-7.584a48.93 48.93 0 01-1.462 10.175" />
          </svg>
        </div>
        <div>
          <p className="text-[13px] font-semibold" style={{ color: "var(--fs-text-primary)" }}>
            Session Monitor
          </p>
          <p className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
            Biometric confidence · F1
            {error && <span style={{ color: "var(--fs-amber)", marginLeft: 6 }}>(API offline)</span>}
          </p>
        </div>
      </div>

      {/* Sessions */}
      <div className="overflow-y-auto space-y-1.5 p-4" style={{ maxHeight: 480 }}>
        {sessions.map((session, i) => {
          const badge = statusStyles[session.status];
          return (
            <motion.div
              key={session.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06, duration: 0.25 }}
              className="rounded-lg p-3 transition-colors"
              style={{
                background: "var(--fs-surface-2)",
                border: "1px solid var(--fs-border)",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--fs-border-active)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--fs-border)")}
            >
              {/* Top row */}
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px]" style={{ color: "var(--fs-green)" }}>
                    {session.id.slice(-8)}
                  </span>
                  <span
                    className="rounded px-1.5 py-0.5 font-mono text-[9px]"
                    style={{ background: "rgba(255,255,255,0.04)", color: "var(--fs-text-tertiary)" }}
                  >
                    {session.country}
                  </span>
                </div>
                <span
                  className="fs-badge"
                  style={{ background: badge.bg, color: badge.text, border: `1px solid ${badge.border}` }}
                >
                  {session.status.toUpperCase()}
                </span>
              </div>

              {/* IP + duration */}
              <div className="flex items-center gap-2 mb-2.5 font-mono text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
                <span>{session.ip}</span>
                <span style={{ color: "var(--fs-border-active)" }}>|</span>
                <span>{session.duration}</span>
              </div>

              {/* Bot confidence bar */}
              <div className="flex items-center gap-2">
                <span className="fs-label" style={{ color: "var(--fs-text-tertiary)", fontSize: 10 }}>Bot</span>
                <div className="fs-progress flex-1" style={{ height: 4 }}>
                  <motion.div
                    className="fs-progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${session.botConfidence * 100}%` }}
                    transition={{ delay: i * 0.06 + 0.15, duration: 0.5, ease: "easeOut" }}
                    style={{ background: getBarColor(session.botConfidence) }}
                  />
                </div>
                <span
                  className="font-mono text-[11px] tabular font-semibold"
                  style={{ color: getBarColor(session.botConfidence) }}
                >
                  {(session.botConfidence * 100).toFixed(0)}%
                </span>
              </div>
            </motion.div>
          );
        })}

        {sessions.length === 0 && !error && (
          <p className="py-10 text-center text-[12px]" style={{ color: "var(--fs-text-tertiary)" }}>
            No active sessions
          </p>
        )}
      </div>
    </div>
  );
}
