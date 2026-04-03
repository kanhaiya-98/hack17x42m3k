"use client";

import { useState } from "react";
import { StatsOverview } from "./StatsOverview";
import { ThreatFeed } from "./ThreatFeed";
import { SessionMonitor } from "./SessionMonitor";
import { NetworkGraph } from "./NetworkGraph";
import { MuleRingPanel } from "./MuleRingPanel";
import { HoneypotPanel } from "./HoneypotPanel";
import { RedTeamPanel } from "./RedTeamPanel";
import { FederationMesh } from "./FederationMesh";

const banks = ["Bank-A", "Bank-B", "Bank-C"] as const;

export function DashboardLayout() {
  const [selectedBank, setSelectedBank] = useState<string>("Bank-A");
  const [bankDropdownOpen, setBankDropdownOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white">
      {/* Top Nav Bar */}
      <nav className="sticky top-0 z-50 flex items-center justify-between border-b border-white/10 bg-[#0a0a0f]/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="relative h-8 w-8">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600" />
              <svg
                viewBox="0 0 32 32"
                className="relative z-10 h-8 w-8 p-1.5"
                fill="none"
                stroke="white"
                strokeWidth="2"
              >
                <path d="M16 4L4 10v12l12 6 12-6V10L16 4z" />
                <path d="M16 16v12" />
                <path d="M4 10l12 6 12-6" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight">
              FinShield{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
                AI
              </span>
            </span>
          </div>
          <span className="ml-2 rounded-md border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] font-medium uppercase tracking-widest text-cyan-400">
            SOC Dashboard
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Bank Selector Dropdown */}
          <div className="relative">
            <button
              onClick={() => setBankDropdownOpen(!bankDropdownOpen)}
              className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm transition-colors hover:bg-white/10"
            >
              <svg className="h-4 w-4 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
              </svg>
              {selectedBank}
              <svg className="h-3 w-3 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {bankDropdownOpen && (
              <div className="absolute right-0 top-full mt-1 w-36 rounded-lg border border-white/10 bg-[#12121a] py-1 shadow-xl">
                {banks.map((bank) => (
                  <button
                    key={bank}
                    onClick={() => {
                      setSelectedBank(bank);
                      setBankDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-1.5 text-left text-sm transition-colors hover:bg-white/10 ${
                      selectedBank === bank ? "text-cyan-400" : "text-white/70"
                    }`}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Connection Status */}
          <div className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
            </span>
            <span className="text-emerald-400">Connected</span>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="mx-auto max-w-[1600px] space-y-6 p-6">
        {/* Top Row: Stats */}
        <StatsOverview />

        {/* Middle Row: Threat Feed + Session Monitor */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ThreatFeed />
          </div>
          <div className="lg:col-span-1">
            <SessionMonitor />
          </div>
        </div>

        {/* Bottom Row: Network Graph + Mule Ring */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <NetworkGraph />
          <MuleRingPanel />
        </div>

        {/* Full Width: Honeypot */}
        <HoneypotPanel />

        {/* Full Width: Red Team */}
        <RedTeamPanel />

        {/* Full Width: Federation Mesh */}
        <FederationMesh />
      </main>
    </div>
  );
}
