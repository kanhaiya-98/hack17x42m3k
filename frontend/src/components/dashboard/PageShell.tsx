"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";

interface PageShellProps {
  children: ReactNode;
}

export function PageShell({ children }: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.18, ease: "easeOut" }}
      className="space-y-8 p-8"
      style={{ maxWidth: 1400, margin: "0 auto" }}
    >
      {children}
    </motion.div>
  );
}

/* ─── Page Header ─── */
interface PageHeaderProps {
  badge: string;
  badgeClass: string;
  title: string;
  description: string;
  statusLabel?: string;
  statusClass?: "green" | "amber" | "red";
}

export function PageHeader({
  badge,
  badgeClass,
  title,
  description,
  statusLabel = "Active",
  statusClass = "green",
}: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div>
        <div className="mb-3">
          <span className={`fs-badge ${badgeClass}`}>{badge}</span>
        </div>
        <h1
          className="mb-2"
          style={{
            fontSize: 28,
            fontWeight: 600,
            color: "var(--fs-text-primary)",
            letterSpacing: "-0.02em",
            lineHeight: 1.2,
          }}
        >
          {title}
        </h1>
        <p style={{ fontSize: 14, color: "var(--fs-text-secondary)", lineHeight: 1.6, maxWidth: 560 }}>
          {description}
        </p>
      </div>

      <div className="shrink-0 pt-1">
        <div className={`fs-status-pill fs-status-${statusClass}`}>
          <span
            className="relative flex h-1.5 w-1.5 shrink-0"
          >
            <span
              className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot"
              style={{ opacity: 0.6, background: statusClass === "green" ? "var(--fs-green)" : statusClass === "red" ? "var(--fs-red)" : "var(--fs-amber)" }}
            />
            <span
              className="relative inline-flex h-1.5 w-1.5 rounded-full"
              style={{ background: statusClass === "green" ? "var(--fs-green)" : statusClass === "red" ? "var(--fs-red)" : "var(--fs-amber)" }}
            />
          </span>
          {statusLabel}
        </div>
      </div>
    </div>
  );
}

/* ─── Insight Box ─── */
interface InsightBoxProps {
  accentColor: string;
  dimColor: string;
  children: ReactNode;
}

export function InsightBox({ accentColor, dimColor, children }: InsightBoxProps) {
  return (
    <div
      className="fs-insight"
      style={{
        background: dimColor,
        borderLeftColor: accentColor,
      }}
    >
      <p className="fs-insight-label" style={{ color: accentColor }}>
        The Core Insight
      </p>
      <div style={{ fontSize: 14, color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>
        {children}
      </div>
    </div>
  );
}

/* ─── Section Title ─── */
export function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <p className="fs-label mb-3" style={{ color: "var(--fs-text-secondary)" }}>
      {children}
    </p>
  );
}

/* ─── Concept Grid ─── */
interface ConceptCard {
  icon: string;
  label: string;
  desc: string;
}

export function ConceptGrid({ items }: { items: ConceptCard[] }) {
  return (
    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item) => (
        <div
          key={item.label}
          className="fs-card"
          style={{ padding: "18px 20px" }}
        >
          <div className="mb-3 text-2xl">{item.icon}</div>
          <div className="mb-1 text-[13px] font-semibold" style={{ color: "var(--fs-text-primary)" }}>
            {item.label}
          </div>
          <div className="text-[12px]" style={{ color: "var(--fs-text-secondary)", lineHeight: 1.6 }}>
            {item.desc}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── Skeleton ─── */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`fs-skeleton ${className}`} />;
}
