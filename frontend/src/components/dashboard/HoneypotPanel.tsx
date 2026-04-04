"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FASTAPI_URL } from "@/lib/supabase";

interface IOCEntry {
  id: number;
  timestamp: string;
  type: "endpoint" | "password" | "payload" | "header" | "recon";
  content: string;
}

const typeColors: Record<string, string> = {
  endpoint: "text-cyan-400",
  password: "text-red-400",
  payload: "text-amber-400",
  header: "text-blue-400",
  recon: "text-purple-400",
};

const typeLabels: Record<string, string> = {
  endpoint: "ENDPOINT",
  password: "CRED_ATT",
  payload: "PAYLOAD ",
  header: "HEADER  ",
  recon: "RECON   ",
};

function guessIOCType(ioc: { type?: string; content?: string; ioc_type?: string }): IOCEntry["type"] {
  const t = ioc.type || ioc.ioc_type || "";
  if (t in typeColors) return t as IOCEntry["type"];
  const content = (ioc.content || "").toLowerCase();
  if (content.includes("login") || content.includes("pass")) return "password";
  if (content.includes("get ") || content.includes("endpoint")) return "endpoint";
  if (content.includes("header") || content.includes("user-agent")) return "header";
  if (content.includes("options") || content.includes("recon") || content.includes(".env")) return "recon";
  return "payload";
}

export function HoneypotPanel() {
  const [isActive] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [visibleIOCs, setVisibleIOCs] = useState<IOCEntry[]>([]);
  const [error, setError] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);
  const iocIdRef = useRef(0);

  // Timer
  useEffect(() => {
    if (!isActive) return;
    const interval = setInterval(() => {
      setElapsedSeconds((s) => s + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isActive]);

  // Poll IOCs from API
  useEffect(() => {
    if (!isActive) return;
    let mounted = true;

    const fetchIOCs = async () => {
      try {
        const res = await fetch(`${FASTAPI_URL}/api/honeypot/iocs`);
        if (!res.ok) throw new Error("fetch failed");
        const data = await res.json();
        if (!mounted) return;
        /* eslint-disable @typescript-eslint/no-explicit-any */
        const arr: any[] = Array.isArray(data) ? data : [];
        const mapped: IOCEntry[] = arr.map((ioc: any) => ({
          id: iocIdRef.current++,
          timestamp: ioc.timestamp || ioc.captured_at || new Date().toISOString().split("T")[1]?.slice(0, 12) || "",
          type: guessIOCType(ioc),
          content: ioc.content || ioc.value || ioc.description || JSON.stringify(ioc),
        }));
        if (mapped.length > 0) {
          setVisibleIOCs((prev) => [...prev, ...mapped].slice(-50));
        }
        setError(false);
      } catch {
        if (mounted) setError(true);
      }
    };

    fetchIOCs();
    const interval = setInterval(fetchIOCs, 4000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [isActive]);

  // Auto-scroll terminal
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [visibleIOCs]);

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600).toString().padStart(2, "0");
    const m = Math.floor((seconds % 3600) / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${h}:${m}:${s}`;
  };

  return (
    <div
      className={`relative overflow-hidden rounded-xl border backdrop-blur-sm transition-colors ${
        isActive
          ? "border-red-500/40 bg-red-500/[0.03]"
          : "border-white/10 bg-white/5"
      }`}
    >
      {/* Pulsing border overlay when active */}
      {isActive && (
        <div className="pointer-events-none absolute inset-0 rounded-xl border-2 border-red-500/30 animate-pulse" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2 text-red-400">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
          </div>
          <div>
            <h2 className="text-sm font-semibold">Honeypot Deception Engine</h2>
            <p className="text-xs text-white/40">
              Adaptive trap system (F5)
              {error && <span className="ml-2 text-amber-400">(API offline)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          {isActive && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-2"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="text-sm font-bold tracking-wider text-red-400">
                ATTACKER TRAPPED
              </span>
            </motion.div>
          )}

          {/* Timer */}
          <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5">
            <span className="font-mono text-lg font-bold text-white/70">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Payload counter */}
          <div className="text-center">
            <p className="text-lg font-bold text-amber-400">{visibleIOCs.length}</p>
            <p className="text-[10px] text-white/30">Payloads</p>
          </div>
        </div>
      </div>

      {/* IOC Terminal Feed */}
      <div className="p-4">
        <div
          ref={terminalRef}
          className="h-[260px] overflow-auto rounded-lg border border-white/5 bg-[#050508] p-4 font-mono text-xs"
        >
          {/* Terminal header */}
          <div className="mb-3 flex items-center gap-1.5 text-white/20">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-amber-500/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/60" />
            <span className="ml-2">honeypot-0x4f2a — IOC Capture Stream</span>
          </div>

          <div className="text-emerald-400/70">
            <p className="text-white/20">--- Honeypot activated. Capturing attacker IOCs ---</p>
            <p className="text-white/20 mb-2">--- Streaming from API ---</p>
          </div>

          <AnimatePresence>
            {visibleIOCs.map((ioc) => (
              <motion.div
                key={ioc.id}
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                transition={{ duration: 0.2 }}
                className="leading-relaxed"
              >
                <span className="text-white/20">[{ioc.timestamp}]</span>{" "}
                <span className={typeColors[ioc.type] || "text-white/50"}>
                  [{typeLabels[ioc.type] || ioc.type}]
                </span>{" "}
                <span className="text-emerald-300/80">{ioc.content}</span>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Blinking cursor */}
          {isActive && (
            <span className="inline-block h-4 w-1.5 animate-pulse bg-emerald-400/60" />
          )}
        </div>
      </div>
    </div>
  );
}
