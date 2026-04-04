"use client";

import { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FASTAPI_URL } from "@/lib/supabase";
import { Skeleton } from "./PageShell";

interface StatsData {
  activeSessions: number;
  threatsDetected: number;
  botsBlocked: number;
  botsBlockedRate: string;
  activeRings: number;
}

function useCountUp(target: number, duration = 800) {
  const [value, setValue] = useState(0);
  const startRef = useRef<number | null>(null);
  const prevTarget = useRef(target);

  useEffect(() => {
    if (target === prevTarget.current && startRef.current !== null) return;
    prevTarget.current = target;
    startRef.current = null;

    const start = performance.now();
    const from = value;

    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // cubic ease-out
      setValue(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return value;
}

interface StatCardProps {
  label: string;
  value: number;
  sub?: string;
  accentColor: string;
  dimColor: string;
  icon: React.ReactNode;
  loading: boolean;
  showLiveDot?: boolean;
  delay?: number;
}

function StatCard({ label, value, sub, accentColor, dimColor, icon, loading, showLiveDot, delay = 0 }: StatCardProps) {
  const displayed = useCountUp(value);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.3, ease: "easeOut" }}
      className="fs-card group relative"
      style={{ padding: "20px 24px" }}
    >
      {/* top row */}
      <div className="flex items-start justify-between mb-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ background: dimColor, border: `1px solid ${accentColor}22` }}
        >
          <span style={{ color: accentColor }}>{icon}</span>
        </div>

        {showLiveDot && (
          <span className="relative flex h-2 w-2">
            <span
              className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot"
              style={{ background: accentColor, opacity: 0.5 }}
            />
            <span
              className="relative inline-flex h-2 w-2 rounded-full"
              style={{ background: accentColor }}
            />
          </span>
        )}
      </div>

      {/* label */}
      <p className="fs-label mb-2" style={{ color: "var(--fs-text-tertiary)" }}>
        {label}
      </p>

      {/* value */}
      {loading ? (
        <Skeleton className="h-9 w-24 mt-1" />
      ) : (
        <p
          className="tabular"
          style={{
            fontSize: 32,
            fontWeight: 700,
            color: accentColor,
            lineHeight: 1,
            letterSpacing: "-0.02em",
          }}
        >
          {displayed.toLocaleString()}
        </p>
      )}

      {/* sub */}
      {sub && !loading && (
        <p className="mt-1.5 text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
          {sub}
        </p>
      )}
    </motion.div>
  );
}

export function StatsOverview() {
  const [data, setData] = useState<StatsData>({
    activeSessions: 0,
    threatsDetected: 0,
    botsBlocked: 0,
    botsBlockedRate: "0.0",
    activeRings: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        const [triageRes, ringsRes, redteamRes] = await Promise.allSettled([
          fetch(`${FASTAPI_URL}/api/triage/history?limit=200`),
          fetch(`${FASTAPI_URL}/api/gnn/rings?status=active`),
          fetch(`${FASTAPI_URL}/api/redteam/runs`),
        ]);

        if (!mounted) return;

        let threats = 0;
        if (triageRes.status === "fulfilled" && triageRes.value.ok) {
          const d = await triageRes.value.json();
          threats = Array.isArray(d) ? d.length : 0;
        }

        let rings = 0;
        if (ringsRes.status === "fulfilled" && ringsRes.value.ok) {
          const d = await ringsRes.value.json();
          rings = Array.isArray(d) ? d.length : 0;
        }

        let blockedRate = "0.0";
        let totalRuns = 0;
        let blocked = 0;
        if (redteamRes.status === "fulfilled" && redteamRes.value.ok) {
          const d = await redteamRes.value.json();
          const arr = Array.isArray(d) ? d : [];
          totalRuns = arr.length;
          blocked = arr.filter((r: { result?: string }) => r.result === "BLOCKED").length;
          blockedRate = totalRuns > 0 ? ((blocked / totalRuns) * 100).toFixed(1) : "0.0";
        }

        setData({
          activeSessions: threats,
          threatsDetected: threats,
          botsBlocked: blocked,
          botsBlockedRate: blockedRate,
          activeRings: rings,
        });
        setLoading(false);
      } catch {
        setLoading(false);
      }
    };

    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const iconProps = { size: 16, strokeWidth: 1.8 };

  const stats = [
    {
      label: "Transactions Analyzed",
      value: data.activeSessions,
      accentColor: "var(--fs-green)",
      dimColor: "var(--fs-green-dim)",
      showLiveDot: true,
      icon: (
        <svg {...iconProps} className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75" />
        </svg>
      ),
    },
    {
      label: "Fraud Threats Detected",
      value: data.threatsDetected,
      accentColor: "var(--fs-red)",
      dimColor: "var(--fs-red-dim)",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
      ),
    },
    {
      label: "Transfers Frozen / Intercepted",
      value: data.botsBlocked,
      sub: `${data.botsBlockedRate}% interception rate`,
      accentColor: "var(--fs-indigo)",
      dimColor: "var(--fs-indigo-dim)",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
        </svg>
      ),
    },
    {
      label: "Active Mule Rings",
      value: data.activeRings,
      accentColor: "var(--fs-amber)",
      dimColor: "var(--fs-amber-dim)",
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, i) => (
        <StatCard
          key={stat.label}
          {...stat}
          value={stat.value}
          loading={loading}
          delay={i * 0.08}
        />
      ))}
    </div>
  );
}
