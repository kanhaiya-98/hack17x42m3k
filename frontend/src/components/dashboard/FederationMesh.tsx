"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { FASTAPI_URL } from "@/lib/supabase";

interface MeshNode {
  id: string;
  label: string;
  x: number;
  y: number;
  type: "bank" | "aggregator";
}

const defaultMeshNodes: MeshNode[] = [
  { id: "bank-a", label: "Bank-A", x: 120, y: 80, type: "bank" },
  { id: "bank-b", label: "Bank-B", x: 480, y: 80, type: "bank" },
  { id: "bank-c", label: "Bank-C", x: 480, y: 260, type: "bank" },
  { id: "aggregator", label: "Aggregator", x: 120, y: 260, type: "aggregator" },
];

const meshEdges = [
  { from: "bank-a", to: "bank-b" },
  { from: "bank-b", to: "bank-c" },
  { from: "bank-c", to: "aggregator" },
  { from: "aggregator", to: "bank-a" },
  { from: "bank-a", to: "bank-c" },
  { from: "bank-b", to: "aggregator" },
];

interface FederationStatus {
  last_sync: string;
  participating_banks: string;
  model_version: string;
  global_accuracy: string;
  rounds_completed: string;
  dp_noise: string;
  events: { time: string; event: string; color: string }[];
}

const defaultStatus: FederationStatus = {
  last_sync: "--",
  participating_banks: "-- / --",
  model_version: "--",
  global_accuracy: "--",
  rounds_completed: "--",
  dp_noise: "--",
  events: [],
};

export function FederationMesh() {
  const [simulating, setSimulating] = useState(false);
  const [attackNode, setAttackNode] = useState<string | null>(null);
  const [status, setStatus] = useState<FederationStatus>(defaultStatus);
  const [error, setError] = useState(false);

  const meshNodes = defaultMeshNodes;

  // Fetch federation status
  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/api/federation/status`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!mounted) return;
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const events: any[] = Array.isArray(data.events) ? data.events : Array.isArray(data.recent_events) ? data.recent_events : [];
        setStatus({
          last_sync: data.last_sync || data.last_round_at || "--",
          participating_banks: data.participating_banks
            ? `${data.participating_banks} / ${data.total_banks || data.participating_banks}`
            : data.banks_online ? `${data.banks_online} / ${data.banks_total || data.banks_online}` : "-- / --",
          model_version: data.model_version || data.version || "--",
          global_accuracy: data.global_accuracy
            ? `${(typeof data.global_accuracy === "number" && data.global_accuracy < 1 ? (data.global_accuracy * 100).toFixed(1) : data.global_accuracy)}%`
            : "--",
          rounds_completed: data.rounds_completed != null
            ? String(data.rounds_completed).replace(/\B(?=(\d{3})+(?!\d))/g, ",")
            : "--",
          dp_noise: data.dp_noise != null ? String(data.dp_noise) : data.epsilon != null ? String(data.epsilon) : "--",
          events: events.slice(0, 5).map((e: any) => ({
            time: e.time || e.timestamp || "",
            event: e.event || e.message || e.description || "",
            color: e.color || "text-cyan-400",
          })),
        });
        setError(false);
      } catch {
        if (mounted) setError(true);
      }
    };

    fetchStatus();
    const interval = setInterval(fetchStatus, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  const simulateAttack = async () => {
    setSimulating(true);
    setAttackNode("bank-b");
    try {
      await fetch(`${FASTAPI_URL}/api/federation/trigger`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bank_id: "bank-b", trigger_reason: "Simulated attack from dashboard" }),
      });
    } catch {
      // silently handle
    }
    setTimeout(() => {
      setAttackNode(null);
      setSimulating(false);
    }, 4000);
  };

  const getNode = (id: string) => meshNodes.find((n) => n.id === id)!;

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-blue-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Federation Mesh</h2>
            <p className="text-xs text-white/40">
              Federated learning network (F6)
              {error && <span className="ml-2 text-amber-400">(API offline)</span>}
            </p>
          </div>
        </div>
        <Button
          onClick={simulateAttack}
          disabled={simulating}
          className="border border-blue-500/30 bg-blue-500/10 text-blue-400 hover:bg-blue-500/20"
        >
          {simulating ? (
            <span className="flex items-center gap-2">
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Simulating...
            </span>
          ) : (
            "Simulate Attack"
          )}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 p-4 lg:grid-cols-3">
        {/* Mesh Visualization */}
        <div className="lg:col-span-2">
          <svg viewBox="0 0 600 340" className="w-full" style={{ minHeight: 300 }}>
            <defs>
              {/* Animated dash pattern */}
              <style>{`
                @keyframes dash-flow {
                  to { stroke-dashoffset: -24; }
                }
                @keyframes particle-flow {
                  0% { offset-distance: 0%; opacity: 0; }
                  10% { opacity: 1; }
                  90% { opacity: 1; }
                  100% { offset-distance: 100%; opacity: 0; }
                }
                .mesh-edge {
                  animation: dash-flow 1.5s linear infinite;
                }
                .mesh-edge-alert {
                  animation: dash-flow 0.5s linear infinite;
                }
              `}</style>
              <linearGradient id="edge-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.6)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0.6)" />
              </linearGradient>
              <linearGradient id="edge-alert" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.8)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0.4)" />
              </linearGradient>
              <radialGradient id="node-glow-bank">
                <stop offset="0%" stopColor="rgba(6, 182, 212, 0.3)" />
                <stop offset="100%" stopColor="rgba(6, 182, 212, 0)" />
              </radialGradient>
              <radialGradient id="node-glow-agg">
                <stop offset="0%" stopColor="rgba(59, 130, 246, 0.3)" />
                <stop offset="100%" stopColor="rgba(59, 130, 246, 0)" />
              </radialGradient>
              <radialGradient id="node-glow-alert">
                <stop offset="0%" stopColor="rgba(239, 68, 68, 0.4)" />
                <stop offset="100%" stopColor="rgba(239, 68, 68, 0)" />
              </radialGradient>
            </defs>

            {/* Edges */}
            {meshEdges.map((edge, i) => {
              const from = getNode(edge.from);
              const to = getNode(edge.to);
              const isAlert =
                simulating && (edge.from === attackNode || edge.to === attackNode);
              return (
                <g key={`edge-${i}`}>
                  <line
                    x1={from.x}
                    y1={from.y}
                    x2={to.x}
                    y2={to.y}
                    stroke={isAlert ? "url(#edge-alert)" : "url(#edge-gradient)"}
                    strokeWidth={isAlert ? 2 : 1.5}
                    strokeDasharray="8 4"
                    className={isAlert ? "mesh-edge-alert" : "mesh-edge"}
                  />
                  {/* Gradient flow particles */}
                  <circle r="3" fill={isAlert ? "#ef4444" : "#06b6d4"}>
                    <animateMotion
                      dur={isAlert ? "1s" : "3s"}
                      repeatCount="indefinite"
                      path={`M${from.x},${from.y} L${to.x},${to.y}`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;1;1;0"
                      dur={isAlert ? "1s" : "3s"}
                      repeatCount="indefinite"
                    />
                  </circle>
                  {/* Reverse particle */}
                  <circle r="2" fill={isAlert ? "#f87171" : "#3b82f6"}>
                    <animateMotion
                      dur={isAlert ? "1.5s" : "4s"}
                      repeatCount="indefinite"
                      path={`M${to.x},${to.y} L${from.x},${from.y}`}
                    />
                    <animate
                      attributeName="opacity"
                      values="0;0.7;0.7;0"
                      dur={isAlert ? "1.5s" : "4s"}
                      repeatCount="indefinite"
                    />
                  </circle>
                </g>
              );
            })}

            {/* Nodes */}
            {meshNodes.map((node) => {
              const isAlert = simulating && node.id === attackNode;
              const isAgg = node.type === "aggregator";
              return (
                <g key={node.id}>
                  {/* Glow */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={40}
                    fill={
                      isAlert
                        ? "url(#node-glow-alert)"
                        : isAgg
                        ? "url(#node-glow-agg)"
                        : "url(#node-glow-bank)"
                    }
                  />
                  {/* Node circle */}
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={isAgg ? 22 : 18}
                    fill={isAlert ? "rgba(239, 68, 68, 0.15)" : "rgba(255, 255, 255, 0.05)"}
                    stroke={
                      isAlert
                        ? "#ef4444"
                        : isAgg
                        ? "#3b82f6"
                        : "#06b6d4"
                    }
                    strokeWidth={isAlert ? 2 : 1.5}
                  />
                  {/* Icon */}
                  {isAgg ? (
                    <text
                      x={node.x}
                      y={node.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill="#3b82f6"
                      fontSize="16"
                    >
                      ⬡
                    </text>
                  ) : (
                    <text
                      x={node.x}
                      y={node.y + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fill={isAlert ? "#ef4444" : "#06b6d4"}
                      fontSize="14"
                    >
                      🏦
                    </text>
                  )}
                  {/* Label */}
                  <text
                    x={node.x}
                    y={node.y + (isAgg ? 36 : 32)}
                    textAnchor="middle"
                    fill={isAlert ? "#f87171" : "rgba(255,255,255,0.5)"}
                    fontSize="11"
                    fontWeight="600"
                  >
                    {node.label}
                  </text>
                  {/* Alert badge */}
                  {isAlert && (
                    <g>
                      <circle cx={node.x + 18} cy={node.y - 18} r="8" fill="#ef4444" />
                      <text
                        x={node.x + 18}
                        y={node.y - 14}
                        textAnchor="middle"
                        fill="white"
                        fontSize="10"
                        fontWeight="bold"
                      >
                        !
                      </text>
                    </g>
                  )}
                </g>
              );
            })}
          </svg>
        </div>

        {/* Stats Card */}
        <div className="space-y-4">
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Network Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Last Sync</span>
                <span className="font-mono text-xs text-cyan-400">{status.last_sync}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Participating Banks</span>
                <span className="text-xs font-semibold text-white/70">{status.participating_banks}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Model Version</span>
                <span className="font-mono text-xs text-blue-400">{status.model_version}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Global Accuracy</span>
                <span className="text-xs font-semibold text-emerald-400">{status.global_accuracy}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">Rounds Completed</span>
                <span className="font-mono text-xs text-white/60">{status.rounds_completed}</span>
              </div>
              <div className="h-px bg-white/5" />
              <div className="flex items-center justify-between">
                <span className="text-xs text-white/40">DP Noise (ε)</span>
                <span className="font-mono text-xs text-amber-400">{status.dp_noise}</span>
              </div>
            </div>
          </div>

          {/* Federation Log */}
          <div className="rounded-lg border border-white/5 bg-white/[0.03] p-4">
            <h3 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
              Recent Events
            </h3>
            <div className="space-y-2">
              {status.events.length > 0 ? (
                status.events.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="font-mono text-[10px] text-white/20 shrink-0">
                      {log.time}
                    </span>
                    <span className={`text-[11px] ${log.color}`}>{log.event}</span>
                  </div>
                ))
              ) : (
                <p className="text-[11px] text-white/30">No recent events</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
