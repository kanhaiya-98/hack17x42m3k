"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FASTAPI_URL } from "@/lib/supabase";

interface MuleRing {
  id: string;
  accounts: number;
  exitWallets: number;
  totalAmount: number;
  confidence: number;
  status: "active" | "resolved" | "investigating";
  detectedAt: string;
  pathSummary: string;
}

const statusColors: Record<string, string> = {
  active: "bg-red-500/20 text-red-400 border-red-500/30",
  resolved: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  investigating: "bg-amber-500/20 text-amber-400 border-amber-500/30",
};

function formatAmount(amount: number): string {
  if (amount >= 10000000) {
    return `₹${(amount / 10000000).toFixed(1)}Cr`;
  }
  if (amount >= 100000) {
    return `₹${(amount / 100000).toFixed(1)}L`;
  }
  return `₹${amount.toLocaleString("en-IN")}`;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapApiRing(r: any, index: number): MuleRing {
  return {
    id: r.ring_id || r.id || `RING-${String(index).padStart(4, "0")}`,
    accounts: r.accounts ?? r.account_count ?? 0,
    exitWallets: r.exit_wallets ?? r.exit_wallet_count ?? 0,
    totalAmount: r.total_amount ?? r.amount ?? 0,
    confidence: r.confidence ?? r.score ?? 0,
    status: r.status || "active",
    detectedAt: r.detected_at
      ? new Date(r.detected_at).toLocaleString()
      : r.detectedAt || "Unknown",
    pathSummary: r.path_summary || r.pathSummary || r.description || "No path data",
  };
}

export function MuleRingPanel() {
  const [rings, setRings] = useState<MuleRing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchRings = async () => {
    try {
      const res = await fetch(`${FASTAPI_URL}/api/gnn/rings?status=active`);
      if (!res.ok) throw new Error("fetch failed");
      const data = await res.json();
      const arr = Array.isArray(data) ? data : [];
      setRings(arr.map(mapApiRing));
      setError(false);
    } catch {
      setError(true);
    }
  };

  useEffect(() => {
    fetchRings();
  }, []);

  const loadDemo = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${FASTAPI_URL}/api/gnn/seed_demo`, { method: "POST" });
      if (!res.ok) throw new Error("seed failed");
      // Refresh the list after seeding
      await fetchRings();
    } catch {
      // silently handle
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-purple-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m9.86-2.373a4.5 4.5 0 00-6.364-6.364L4.34 8.161a4.5 4.5 0 001.242 7.244" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">GNN Mule Ring Detection</h2>
            <p className="text-xs text-white/40">
              Transaction graph analysis (F7)
              {error && <span className="ml-2 text-amber-400">(API offline)</span>}
            </p>
          </div>
        </div>
        <Button
          onClick={loadDemo}
          disabled={loading}
          className="border border-purple-500/30 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20"
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Loading...
            </span>
          ) : (
            "Load Demo Mule Ring"
          )}
        </Button>
      </div>

      {/* Rings */}
      <div className="space-y-3 overflow-auto p-4">
        {rings.map((ring, i) => (
          <motion.div
            key={ring.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1, duration: 0.3 }}
            className="rounded-lg border border-white/5 bg-white/[0.03] p-4 transition-colors hover:border-white/10 hover:bg-white/[0.05]"
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-semibold text-white/80">{ring.id}</span>
                <span
                  className={`rounded-md border px-2 py-0.5 text-[10px] font-medium uppercase ${
                    statusColors[ring.status] || statusColors.active
                  }`}
                >
                  {ring.status}
                </span>
              </div>
              <span className="text-[11px] text-white/30">{ring.detectedAt}</span>
            </div>

            {/* Stats row */}
            <div className="mt-3 flex items-center gap-4">
              <div className="text-center">
                <p className="text-lg font-bold text-white/80">{ring.accounts}</p>
                <p className="text-[10px] text-white/30">Accounts</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-lg font-bold text-white/80">{ring.exitWallets}</p>
                <p className="text-[10px] text-white/30">Exit Wallets</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              <div className="text-center">
                <p className="text-lg font-bold text-purple-400">{formatAmount(ring.totalAmount)}</p>
                <p className="text-[10px] text-white/30">Total Amount</p>
              </div>
              <div className="h-8 w-px bg-white/10" />
              {/* Confidence gauge */}
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-white/30">Confidence</span>
                  <span className="font-mono text-xs font-semibold text-purple-400">
                    {(ring.confidence * 100).toFixed(0)}%
                  </span>
                </div>
                <div className="mt-1 h-2 rounded-full bg-white/10">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${ring.confidence * 100}%` }}
                    transition={{ delay: i * 0.1 + 0.3, duration: 0.6 }}
                    className="h-full rounded-full bg-gradient-to-r from-purple-600 to-purple-400"
                  />
                </div>
              </div>
            </div>

            {/* Path summary */}
            <div className="mt-3 rounded-md bg-white/[0.03] px-3 py-2">
              <p className="font-mono text-[11px] leading-relaxed text-white/40">
                {ring.pathSummary}
              </p>
            </div>
          </motion.div>
        ))}
        {rings.length === 0 && !error && (
          <p className="py-8 text-center text-xs text-white/30">No active mule rings. Click "Load Demo Mule Ring" to seed demo data.</p>
        )}
      </div>
    </div>
  );
}
