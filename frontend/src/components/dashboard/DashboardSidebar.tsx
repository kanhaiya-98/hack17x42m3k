"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Fingerprint,
  Globe,
  Sparkles,
  Bug,
  GitMerge,
  Network,
  Terminal,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  exact?: boolean;
  icon: React.ReactNode;
  badge: string | null;
  badgeClass: string;
}

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "Mission Control",
    exact: true,
    icon: <LayoutDashboard size={15} />,
    badge: null,
    badgeClass: "",
  },
  {
    href: "/dashboard/biometric",
    label: "Behavior Scanner",
    icon: <Fingerprint size={15} />,
    badge: "F1",
    badgeClass: "fs-badge-green",
  },
  {
    href: "/dashboard/attack-visualizer",
    label: "Attack Visualizer",
    icon: <Globe size={15} />,
    badge: "F3",
    badgeClass: "fs-badge-teal",
  },
  {
    href: "/dashboard/ai-triage",
    label: "AI Brain",
    icon: <Sparkles size={15} />,
    badge: "F4",
    badgeClass: "fs-badge-indigo",
  },
  {
    href: "/dashboard/honeypot",
    label: "The Trap",
    icon: <Bug size={15} />,
    badge: "F5",
    badgeClass: "fs-badge-amber",
  },
  {
    href: "/dashboard/federation",
    label: "Federation Mesh",
    icon: <GitMerge size={15} />,
    badge: "F6",
    badgeClass: "fs-badge-purple",
  },
  {
    href: "/dashboard/mule-ring",
    label: "Mule Ring Detector",
    icon: <Network size={15} />,
    badge: "F7",
    badgeClass: "fs-badge-orange",
  },
  {
    href: "/dashboard/red-team",
    label: "Red Team Agent",
    icon: <Terminal size={15} />,
    badge: "F8",
    badgeClass: "fs-badge-red",
  },
];

const banks = ["Bank-A", "Bank-B", "Bank-C"] as const;

export function DashboardSidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [selectedBank, setSelectedBank] = useState<string>("Bank-A");
  const [bankOpen, setBankOpen] = useState(false);

  const isActive = (item: NavItem) => {
    if (item.exact) return pathname === item.href;
    return pathname.startsWith(item.href) && pathname !== "/dashboard";
  };

  return (
    <motion.aside
      animate={{ width: collapsed ? 60 : 220 }}
      transition={{ duration: 0.2, ease: "easeInOut" }}
      style={{ background: "var(--fs-surface-1)" }}
      className="relative flex h-full flex-col border-r overflow-hidden shrink-0"
    >
      {/* ── Logo Row ── */}
      <div
        className="flex h-[56px] shrink-0 items-center justify-between border-b px-4"
        style={{ borderColor: "var(--fs-border)" }}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              key="logo"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-2.5 overflow-hidden"
            >
              {/* Shield icon */}
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg"
                style={{ background: "var(--fs-green-dim)", border: "1px solid rgba(0,220,130,0.2)" }}
              >
                <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--fs-green)" }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                </svg>
              </div>
              <span className="text-sm font-semibold whitespace-nowrap" style={{ color: "var(--fs-text-primary)", letterSpacing: "-0.01em" }}>
                FinShield{" "}
                <span style={{ color: "var(--fs-green)" }}>AI</span>
              </span>
            </motion.div>
          )}
          {collapsed && (
            <motion.div
              key="logo-mini"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="mx-auto flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "var(--fs-green-dim)", border: "1px solid rgba(0,220,130,0.2)" }}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} style={{ color: "var(--fs-green)" }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
              </svg>
            </motion.div>
          )}
        </AnimatePresence>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="shrink-0 rounded-md p-1 transition-colors"
          style={{ color: "var(--fs-text-tertiary)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--fs-text-secondary)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--fs-text-tertiary)")}
        >
          {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>
      </div>

      {/* ── Live Badge ── */}
      {!collapsed && (
        <div className="mx-3 mt-3">
          <div
            className="flex items-center gap-2 rounded-md px-3 py-2"
            style={{ background: "var(--fs-surface-2)", border: "1px solid var(--fs-border)" }}
          >
            <span className="relative flex h-2 w-2 shrink-0">
              <span
                className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot"
                style={{ background: "var(--fs-green)", opacity: 0.6 }}
              />
              <span
                className="relative inline-flex h-2 w-2 rounded-full"
                style={{ background: "var(--fs-green)" }}
              />
            </span>
            <span className="fs-label" style={{ color: "var(--fs-green)" }}>
              Live · SOC Dashboard
            </span>
          </div>
        </div>
      )}

      {/* ── Nav ── */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {!collapsed && (
          <p className="mb-2 px-2 fs-label" style={{ color: "var(--fs-text-tertiary)" }}>
            Navigation
          </p>
        )}

        {navItems.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className="group flex items-center gap-2.5 rounded-lg transition-all"
              style={{
                height: "36px",
                padding: collapsed ? "0 12px" : "0 12px",
                justifyContent: collapsed ? "center" : "flex-start",
                borderLeft: active ? `1px solid var(--fs-green)` : "1px solid transparent",
                background: active ? "var(--fs-green-dim)" : "transparent",
                color: active ? "var(--fs-green)" : "var(--fs-text-secondary)",
                transition: "all 150ms ease",
              }}
              onMouseEnter={e => {
                if (!active) {
                  e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                  e.currentTarget.style.color = "var(--fs-text-primary)";
                }
              }}
              onMouseLeave={e => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--fs-text-secondary)";
                }
              }}
            >
              <span className="shrink-0">{item.icon}</span>

              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="flex-1 truncate text-[13px] font-medium"
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>

              {!collapsed && item.badge && (
                <span className={`fs-badge ${item.badgeClass} shrink-0`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* ── Bank Selector + Back ── */}
      {!collapsed && (
        <div
          className="border-t p-3 space-y-1.5"
          style={{ borderColor: "var(--fs-border)" }}
        >
          <div className="relative">
            <button
              onClick={() => setBankOpen(!bankOpen)}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm transition-all"
              style={{
                background: "var(--fs-surface-2)",
                border: "1px solid var(--fs-border)",
                color: "var(--fs-text-secondary)",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--fs-border-active)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--fs-border)")}
            >
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} style={{ color: "var(--fs-green)" }}>
                <path d="M3 21h18M3 10h18M5 6l7-3 7 3M4 10v11M20 10v11M8 14v3M12 14v3M16 14v3" />
              </svg>
              <span className="flex-1 text-left text-[13px]" style={{ color: "var(--fs-text-primary)" }}>
                {selectedBank}
              </span>
              <ChevronDown size={12} style={{ color: "var(--fs-text-tertiary)" }} />
            </button>

            {bankOpen && (
              <div
                className="absolute bottom-full mb-1 w-full rounded-lg py-1 shadow-2xl"
                style={{
                  background: "var(--fs-surface-2)",
                  border: "1px solid var(--fs-border-active)",
                }}
              >
                {banks.map((bank) => (
                  <button
                    key={bank}
                    onClick={() => { setSelectedBank(bank); setBankOpen(false); }}
                    className="w-full px-3 py-2 text-left text-[13px] transition-colors"
                    style={{
                      color: selectedBank === bank ? "var(--fs-green)" : "var(--fs-text-secondary)",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "rgba(255,255,255,0.04)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                  >
                    {bank}
                  </button>
                ))}
              </div>
            )}
          </div>

          <Link
            href="/"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] transition-colors"
            style={{ color: "var(--fs-text-tertiary)" }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--fs-text-secondary)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--fs-text-tertiary)")}
          >
            <ArrowLeft size={12} />
            Back to Landing
          </Link>
        </div>
      )}
    </motion.aside>
  );
}
