"use client";

import { useEffect, useState, useRef } from "react";
import { FASTAPI_URL } from "@/lib/supabase";

interface GraphNode {
  id: string;
  x: number;
  y: number;
  type: "clean" | "botnet" | "suspicious";
  label: string;
}

interface GraphEdge {
  from: string;
  to: string;
}

const nodeColors: Record<string, { fill: string; stroke: string; glow: string }> = {
  clean: { fill: "#10b981", stroke: "#34d399", glow: "rgba(16, 185, 129, 0.3)" },
  botnet: { fill: "#ef4444", stroke: "#f87171", glow: "rgba(239, 68, 68, 0.4)" },
  suspicious: { fill: "#f59e0b", stroke: "#fbbf24", glow: "rgba(245, 158, 11, 0.3)" },
};

function classifyNode(node: { bot_score?: number; type?: string }): "clean" | "botnet" | "suspicious" {
  if (node.type === "botnet" || node.type === "suspicious" || node.type === "clean") {
    return node.type;
  }
  const score = node.bot_score ?? 0;
  if (score > 0.72) return "botnet";
  if (score >= 0.4) return "suspicious";
  return "clean";
}

export function NetworkGraph() {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [offsets, setOffsets] = useState<Record<string, { dx: number; dy: number }>>({});
  const [error, setError] = useState(false);
  const animRef = useRef<number>(0);
  const timeRef = useRef(0);
  const nodesRef = useRef<GraphNode[]>([]);

  // Fetch graph data
  useEffect(() => {
    let mounted = true;

    const fetchGraph = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/api/network/graph?window=60`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!mounted) return;
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const rawNodes: any[] = Array.isArray(data?.nodes) ? data.nodes : [];
        const rawEdges: any[] = Array.isArray(data?.edges) ? data.edges : [];

        const mappedNodes: GraphNode[] = rawNodes.map((n: any, i: number) => {
          const col = i % 6;
          const row = Math.floor(i / 6);
          return {
            id: n.id || `n${i}`,
            x: 60 + col * 95 + (Math.random() * 30 - 15),
            y: 50 + row * 70 + (Math.random() * 20 - 10),
            type: classifyNode(n),
            label: n.label || n.id || `S-${i}`,
          };
        });

        const nodeIds = new Set(mappedNodes.map((n) => n.id));
        const mappedEdges: GraphEdge[] = rawEdges
          .filter((e: any) => nodeIds.has(e.from || e.source) && nodeIds.has(e.to || e.target))
          .map((e: any) => ({
            from: e.from || e.source,
            to: e.to || e.target,
          }));

        setNodes(mappedNodes);
        nodesRef.current = mappedNodes;
        setEdges(mappedEdges);
        setError(false);
      } catch {
        if (mounted) setError(true);
      }
    };

    fetchGraph();
    const interval = setInterval(fetchGraph, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  // Animation loop
  useEffect(() => {
    const animate = () => {
      timeRef.current += 0.02;
      const newOffsets: Record<string, { dx: number; dy: number }> = {};
      nodesRef.current.forEach((node, i) => {
        const phase = i * 1.3;
        newOffsets[node.id] = {
          dx: Math.sin(timeRef.current + phase) * 3,
          dy: Math.cos(timeRef.current * 0.7 + phase) * 3,
        };
      });
      setOffsets(newOffsets);
      animRef.current = requestAnimationFrame(animate);
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, []);

  const getNodePos = (id: string) => {
    const node = nodes.find((n) => n.id === id);
    if (!node) return { x: 0, y: 0 };
    const offset = offsets[id] || { dx: 0, dy: 0 };
    return { x: node.x + offset.dx, y: node.y + offset.dy };
  };

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
        <div className="rounded-lg border border-white/10 bg-white/5 p-2 text-blue-400">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
          </svg>
        </div>
        <div>
          <h2 className="text-sm font-semibold">Network Anomaly Detection</h2>
          <p className="text-xs text-white/40">
            Session graph with shared fingerprints (F3)
            {error && <span className="ml-2 text-amber-400">(API offline)</span>}
          </p>
        </div>
      </div>

      {/* Graph */}
      <div className="p-4">
        <svg viewBox="0 0 600 280" className="w-full" style={{ minHeight: 280 }}>
          <defs>
            <filter id="glow-green">
              <feGaussianBlur stdDeviation="4" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
            <filter id="glow-red">
              <feGaussianBlur stdDeviation="6" result="coloredBlur" />
              <feMerge><feMergeNode in="coloredBlur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>

          {/* Edges */}
          {edges.map((edge, i) => {
            const from = getNodePos(edge.from);
            const to = getNodePos(edge.to);
            const fromNode = nodes.find((n) => n.id === edge.from);
            const toNode = nodes.find((n) => n.id === edge.to);
            const isBotnet = fromNode?.type === "botnet" && toNode?.type === "botnet";
            return (
              <line
                key={`edge-${i}`}
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke={isBotnet ? "rgba(239, 68, 68, 0.3)" : "rgba(255, 255, 255, 0.08)"}
                strokeWidth={isBotnet ? 1.5 : 1}
                strokeDasharray={isBotnet ? "" : "4 4"}
              />
            );
          })}

          {/* Nodes */}
          {nodes.map((node) => {
            const pos = getNodePos(node.id);
            const colors = nodeColors[node.type];
            return (
              <g key={node.id}>
                {/* Glow */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={node.type === "botnet" ? 14 : 10}
                  fill={colors.glow}
                  filter={node.type === "botnet" ? "url(#glow-red)" : "url(#glow-green)"}
                />
                {/* Node */}
                <circle
                  cx={pos.x}
                  cy={pos.y}
                  r={6}
                  fill={colors.fill}
                  stroke={colors.stroke}
                  strokeWidth={1.5}
                />
                {/* Label */}
                <text
                  x={pos.x}
                  y={pos.y + 16}
                  textAnchor="middle"
                  fill="rgba(255,255,255,0.35)"
                  fontSize="8"
                  fontFamily="monospace"
                >
                  {node.label}
                </text>
              </g>
            );
          })}

          {nodes.length === 0 && (
            <text x="300" y="140" textAnchor="middle" fill="rgba(255,255,255,0.3)" fontSize="12">
              {error ? "API offline" : "Waiting for data..."}
            </text>
          )}
        </svg>

        {/* Legend */}
        <div className="mt-3 flex items-center gap-4 text-[11px] text-white/40">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Clean
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500" />
            Botnet Cluster
          </div>
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
            Suspicious
          </div>
        </div>
      </div>
    </div>
  );
}
