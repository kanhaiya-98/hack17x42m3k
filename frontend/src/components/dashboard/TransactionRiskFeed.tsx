"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FASTAPI_URL } from "@/lib/supabase";

// ── Types ────────────────────────────────────────────────────────────────────

interface LiveTransaction {
  transaction_id: string;
  from_account: string;
  to_account: string;
  amount: number;
  currency: string;
  channel: string;
  gnn_risk_score: number;
  is_mule_suspect: boolean;
  ring_id: string | null;
  attack_type: string;
  action: string;
  timestamp: string;
  // from triage
  fraud_classification?: string;
  transaction_action?: string;
  reasoning_summary?: string;
}

// ── Constants ────────────────────────────────────────────────────────────────

const ATTACK_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  "APP Fraud":              { bg: "var(--fs-red-dim)",    text: "var(--fs-red)",    border: "rgba(239,68,68,0.3)" },
  "APP Fraud + Money Mule": { bg: "var(--fs-red-dim)",    text: "var(--fs-red)",    border: "rgba(239,68,68,0.3)" },
  "Money Mule":             { bg: "var(--fs-purple-dim)", text: "var(--fs-purple)", border: "rgba(168,85,247,0.3)" },
  "Money Mule Ring":        { bg: "var(--fs-purple-dim)", text: "var(--fs-purple)", border: "rgba(168,85,247,0.3)" },
  "Transaction Smurfing":   { bg: "var(--fs-amber-dim)",  text: "var(--fs-amber)",  border: "rgba(245,158,11,0.3)" },
  "Hub-and-Spoke":          { bg: "var(--fs-orange-dim)", text: "var(--fs-orange)", border: "rgba(249,115,22,0.3)" },
  "Frozen Account — Transfer Blocked": { bg: "rgba(239,68,68,0.15)", text: "var(--fs-red)", border: "rgba(239,68,68,0.5)" },
  "Benign":                 { bg: "var(--fs-green-dim)",  text: "var(--fs-green)",  border: "rgba(0,220,130,0.2)" },
};

const ACTION_STYLES: Record<string, { bg: string; text: string; label: string }> = {
  freeze_transfer:    { bg: "var(--fs-red-dim)",    text: "var(--fs-red)",    label: "❌ FROZEN" },
  step_up_mfa:        { bg: "var(--fs-amber-dim)",  text: "var(--fs-amber)",  label: "🔐 MFA REQUIRED" },
  honeypot_escrow:    { bg: "var(--fs-purple-dim)", text: "var(--fs-purple)", label: "🪤 HONEYPOT" },
  flag_reversal:      { bg: "var(--fs-orange-dim)", text: "var(--fs-orange)", label: "↩ FLAG REVERSAL" },
  alert_compliance:   { bg: "var(--fs-indigo-dim)", text: "var(--fs-indigo)", label: "⚠ MONITORING" },
  approve:            { bg: "var(--fs-green-dim)",  text: "var(--fs-green)",  label: "✓ APPROVED" },
};

function formatAmount(amount: number): string {
  if (amount >= 10_000_000) return `₹${(amount / 10_000_000).toFixed(2)}Cr`;
  if (amount >= 100_000)    return `₹${(amount / 100_000).toFixed(2)}L`;
  if (amount >= 1_000)      return `₹${(amount / 1_000).toFixed(1)}k`;
  return `₹${amount.toLocaleString("en-IN")}`;
}

function riskLabel(score: number): { label: string; color: string } {
  if (score >= 0.85) return { label: "CRITICAL", color: "var(--fs-red)" };
  if (score >= 0.65) return { label: "HIGH", color: "var(--fs-orange)" };
  if (score >= 0.45) return { label: "MEDIUM", color: "var(--fs-amber)" };
  return { label: "LOW", color: "var(--fs-green)" };
}

function maskAccount(acc: string): string {
  if (acc.length <= 6) return acc;
  return acc.slice(0, 4) + "••••" + acc.slice(-4);
}

// ── Simulate a live transaction for demo ──────────────────────────────────────

const ATTACK_TYPES = [
  "APP Fraud", "Money Mule", "Transaction Smurfing",
  "Hub-and-Spoke", "Money Mule Ring", "Benign", "Benign",
];
const CHANNELS = ["UPI", "NEFT", "IMPS", "RTGS"];
const MOCK_ACCOUNTS = ["HDFC12345678", "ICIC87654321", "SBIN11223344", "UTIB99887766", "KKBK55443322"];

function generateMockTransaction(): LiveTransaction {
  const attackType = ATTACK_TYPES[Math.floor(Math.random() * ATTACK_TYPES.length)];
  const isBenign = attackType === "Benign";
  const riskScore = isBenign
    ? parseFloat((Math.random() * 0.3).toFixed(4))
    : parseFloat((0.55 + Math.random() * 0.44).toFixed(4));

  const amount = isBenign
    ? parseFloat((Math.random() * 15000 + 500).toFixed(2))
    : attackType === "Transaction Smurfing"
    ? parseFloat((7200 + Math.random() * 2700).toFixed(2))
    : parseFloat((50000 + Math.random() * 450000).toFixed(2));

  let action = "approve";
  if (riskScore > 0.85) action = "freeze_transfer";
  else if (riskScore > 0.70) action = "step_up_mfa";
  else if (riskScore > 0.55) action = "honeypot_escrow";
  else if (!isBenign) action = "alert_compliance";

  return {
    transaction_id: `TXN-${Math.random().toString(36).slice(2, 12).toUpperCase()}`,
    from_account: MOCK_ACCOUNTS[Math.floor(Math.random() * MOCK_ACCOUNTS.length)],
    to_account: MOCK_ACCOUNTS[Math.floor(Math.random() * MOCK_ACCOUNTS.length)],
    amount,
    currency: "INR",
    channel: CHANNELS[Math.floor(Math.random() * CHANNELS.length)],
    gnn_risk_score: riskScore,
    is_mule_suspect: riskScore > 0.60,
    ring_id: !isBenign && riskScore > 0.70 ? `RING-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : null,
    attack_type: attackType,
    action,
    timestamp: new Date().toISOString(),
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

export function TransactionRiskFeed() {
  const [transactions, setTransactions] = useState<LiveTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [frozenAccounts, setFrozenAccounts] = useState<Set<string>>(new Set());
  const [freezingId, setFreezingId] = useState<string | null>(null);
  const [liveFeed, setLiveFeed] = useState(false);
  const [apiError, setApiError] = useState(false);

  const fetchTransactions = useCallback(async () => {
    try {
      const res = await fetch(`${FASTAPI_URL}/api/gnn/transactions?limit=30`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const txns: LiveTransaction[] = (data.transactions || []).map((t: LiveTransaction) => ({
        ...t,
        attack_type: t.attack_type || "Benign",
        action: t.action || "approve",
      }));
      if (txns.length > 0) {
        setTransactions(txns);
        setApiError(false);
      }
    } catch {
      setApiError(true);
    }
  }, []);

  const seedAndFetch = async () => {
    setLoading(true);
    try {
      await fetch(`${FASTAPI_URL}/api/gnn/seed_demo`, { method: "POST" });
      await fetchTransactions();
    } catch {
      setApiError(true);
    } finally {
      setLoading(false);
    }
  };

  const freezeAccount = async (txn: LiveTransaction) => {
    setFreezingId(txn.transaction_id);
    try {
      await fetch(
        `${FASTAPI_URL}/api/gnn/freeze_account?account_id=${txn.to_account}&reason=Mule ring detected`,
        { method: "POST" }
      );
      setFrozenAccounts((prev) => new Set([...prev, txn.to_account]));
      // Update UI immediately
      setTransactions((prev) =>
        prev.map((t) =>
          t.to_account === txn.to_account
            ? { ...t, action: "freeze_transfer", attack_type: "Frozen Account — Transfer Blocked", gnn_risk_score: 0.99 }
            : t
        )
      );
    } catch {
      /* silent */
    } finally {
      setFreezingId(null);
    }
  };

  // Auto live feed
  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  useEffect(() => {
    if (!liveFeed) return;
    const interval = setInterval(() => {
      setTransactions((prev) => [generateMockTransaction(), ...prev.slice(0, 24)]);
    }, 2500);
    return () => clearInterval(interval);
  }, [liveFeed]);

  const flaggedCount = transactions.filter((t) => t.gnn_risk_score > 0.60).length;
  const totalVolume = transactions.reduce((s, t) => s + t.amount, 0);

  return (
    <div className="fs-card flex flex-col" style={{ padding: 0 }}>
      {/* ── Header ── */}
      <div
        className="flex items-center justify-between px-5 py-4 shrink-0"
        style={{ borderBottom: "1px solid var(--fs-border)" }}
      >
        <div className="flex items-center gap-3">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
            style={{ background: "var(--fs-orange-dim)", border: "1px solid rgba(249,115,22,0.25)" }}
          >
            {/* Currency / transaction icon */}
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} style={{ color: "var(--fs-orange)" }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 01-.75.75h-.75" />
            </svg>
          </div>
          <div>
            <p className="text-[13px] font-semibold" style={{ color: "var(--fs-text-primary)" }}>
              Transaction Risk Feed
            </p>
            <p className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
              GNN real-time UPI/NEFT fraud detection (F7)
              {apiError && <span style={{ color: "var(--fs-amber)", marginLeft: 6 }}>(API offline — showing mock)</span>}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Stats pills */}
          <div
            className="hidden sm:flex items-center gap-1 rounded-md px-2 py-1 text-[11px] font-semibold tabular"
            style={{ background: "var(--fs-red-dim)", color: "var(--fs-red)", border: "1px solid rgba(239,68,68,0.2)" }}
          >
            {flaggedCount} flagged
          </div>

          {/* Live toggle */}
          <button
            onClick={() => setLiveFeed((v) => !v)}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all"
            style={{
              background: liveFeed ? "var(--fs-green-dim)" : "var(--fs-surface-2)",
              border: `1px solid ${liveFeed ? "rgba(0,220,130,0.3)" : "var(--fs-border)"}`,
              color: liveFeed ? "var(--fs-green)" : "var(--fs-text-tertiary)",
            }}
          >
            {liveFeed && (
              <span className="relative flex h-1.5 w-1.5">
                <span className="absolute inline-flex h-full w-full rounded-full fs-pulse-dot" style={{ background: "var(--fs-green)", opacity: 0.5 }} />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full" style={{ background: "var(--fs-green)" }} />
              </span>
            )}
            {liveFeed ? "Live" : "Paused"}
          </button>

          {/* Seed button */}
          <button
            onClick={seedAndFetch}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[11px] font-semibold transition-all active:scale-95"
            style={{
              background: "var(--fs-indigo-dim)",
              border: "1px solid rgba(99,102,241,0.3)",
              color: "var(--fs-indigo)",
            }}
          >
            {loading ? (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : null}
            {loading ? "Loading…" : "Seed Demo"}
          </button>
        </div>
      </div>

      {/* ── Summary bar ── */}
      {transactions.length > 0 && (
        <div
          className="flex items-center gap-6 px-5 py-2.5 shrink-0"
          style={{ borderBottom: "1px solid var(--fs-border)", background: "rgba(255,255,255,0.02)" }}
        >
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>TRANSACTIONS</span>
            <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--fs-text-primary)" }}>{transactions.length}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>TOTAL VOLUME</span>
            <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--fs-amber)" }}>{formatAmount(totalVolume)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px]" style={{ color: "var(--fs-text-tertiary)" }}>FROZEN ACCOUNTS</span>
            <span className="font-mono text-[12px] font-semibold" style={{ color: "var(--fs-red)" }}>{frozenAccounts.size}</span>
          </div>
        </div>
      )}

      {/* ── Feed ── */}
      <div className="overflow-y-auto flex-1" style={{ maxHeight: 520 }}>
        <div className="space-y-1.5 p-3">
          <AnimatePresence initial={false}>
            {transactions.map((txn) => {
              const attackColor = ATTACK_COLORS[txn.attack_type] ?? ATTACK_COLORS["Benign"];
              const actionStyle = ACTION_STYLES[txn.action] ?? ACTION_STYLES["approve"];
              const risk = riskLabel(txn.gnn_risk_score);
              const isFrozen = frozenAccounts.has(txn.to_account);
              const isCritical = txn.gnn_risk_score >= 0.85;

              return (
                <motion.div
                  key={txn.transaction_id}
                  initial={{ opacity: 0, x: -16, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-lg p-3.5 transition-colors"
                  style={{
                    background: isCritical ? "rgba(239,68,68,0.04)" : "var(--fs-surface-2)",
                    border: `1px solid ${isCritical ? "rgba(239,68,68,0.2)" : "var(--fs-border)"}`,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--fs-border-active)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = isCritical ? "rgba(239,68,68,0.2)" : "var(--fs-border)")}
                >
                  <div className="flex items-start justify-between gap-3">
                    {/* Left: main info */}
                    <div className="flex-1 min-w-0 space-y-2">
                      {/* Row 1: attack type + risk + channel */}
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-semibold"
                          style={{ background: attackColor.bg, color: attackColor.text, border: `1px solid ${attackColor.border}` }}
                        >
                          {txn.attack_type}
                        </span>
                        <span className="text-[10px] font-bold uppercase" style={{ color: risk.color }}>
                          {risk.label}
                        </span>
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-mono"
                          style={{ background: "var(--fs-surface-1)", color: "var(--fs-text-tertiary)", border: "1px solid var(--fs-border)" }}
                        >
                          {txn.channel}
                        </span>
                        {txn.ring_id && (
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-mono"
                            style={{ background: "var(--fs-purple-dim)", color: "var(--fs-purple)", border: "1px solid rgba(168,85,247,0.2)" }}
                          >
                            {txn.ring_id}
                          </span>
                        )}
                      </div>

                      {/* Row 2: amount + accounts */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono text-[14px] font-bold" style={{ color: txn.gnn_risk_score > 0.60 ? "var(--fs-red)" : "var(--fs-text-primary)" }}>
                          {formatAmount(txn.amount)}
                        </span>
                        <span className="text-[11px]" style={{ color: "var(--fs-text-tertiary)" }}>
                          {maskAccount(txn.from_account)} → {maskAccount(txn.to_account)}
                        </span>
                      </div>

                      {/* Row 3: GNN risk bar */}
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] shrink-0" style={{ color: "var(--fs-text-tertiary)" }}>GNN</span>
                        <div className="fs-progress flex-1" style={{ height: 4 }}>
                          <div
                            className="fs-progress-fill"
                            style={{
                              width: `${txn.gnn_risk_score * 100}%`,
                              background: txn.gnn_risk_score > 0.85
                                ? "var(--fs-red)"
                                : txn.gnn_risk_score > 0.65
                                ? "var(--fs-amber)"
                                : "var(--fs-green)",
                            }}
                          />
                        </div>
                        <span className="font-mono text-[10px] tabular shrink-0" style={{ color: "var(--fs-text-tertiary)" }}>
                          {(txn.gnn_risk_score * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>

                    {/* Right: action + kill-chain button */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <span
                        className="rounded px-2 py-1 text-[10px] font-bold whitespace-nowrap"
                        style={{ background: actionStyle.bg, color: actionStyle.text, border: `1px solid ${actionStyle.text}33` }}
                      >
                        {actionStyle.label}
                      </span>

                      {/* Kill Chain: Freeze Account button (only for high risk) */}
                      {txn.gnn_risk_score > 0.60 && !isFrozen && (
                        <button
                          onClick={() => freezeAccount(txn)}
                          disabled={freezingId === txn.transaction_id}
                          className="flex items-center gap-1 rounded px-2 py-1 text-[10px] font-semibold transition-all active:scale-95"
                          style={{
                            background: "rgba(239,68,68,0.1)",
                            border: "1px solid rgba(239,68,68,0.3)",
                            color: "var(--fs-red)",
                          }}
                          title="Freeze beneficiary account & broadcast to federation"
                        >
                          {freezingId === txn.transaction_id ? (
                            <svg className="h-2.5 w-2.5 animate-spin" viewBox="0 0 24 24" fill="none">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                            </svg>
                          ) : "❄"}
                          Freeze Account
                        </button>
                      )}

                      {isFrozen && (
                        <span className="text-[10px]" style={{ color: "var(--fs-red)" }}>
                          ✓ Account Frozen
                        </span>
                      )}

                      <span className="font-mono text-[9px] tabular" style={{ color: "var(--fs-text-tertiary)" }}>
                        {new Date(txn.timestamp).toLocaleTimeString("en-IN", { hour12: false })}
                      </span>
                    </div>
                  </div>

                  {/* APP Fraud intercept banner */}
                  {(txn.attack_type === "APP Fraud" || txn.attack_type === "APP Fraud + Money Mule") && txn.action !== "approve" && (
                    <div
                      className="mt-2 rounded px-3 py-2 text-[11px]"
                      style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.15)", color: "var(--fs-text-secondary)" }}
                    >
                      <span className="font-semibold" style={{ color: "var(--fs-red)" }}>⚠ Transaction Intercepted — </span>
                      High-value push payment to first-time beneficiary. Customer may be victim of social engineering (investment scam / emergency fraud). Step-up verification triggered.
                    </div>
                  )}
                </motion.div>
              );
            })}
          </AnimatePresence>

          {transactions.length === 0 && (
            <div className="py-12 text-center">
              <p className="text-[13px] font-medium" style={{ color: "var(--fs-text-secondary)" }}>No transactions yet</p>
              <p className="mt-1 text-[12px]" style={{ color: "var(--fs-text-tertiary)" }}>
                Click &ldquo;Seed Demo&rdquo; to load UPI fraud scenarios, or enable Live feed.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
