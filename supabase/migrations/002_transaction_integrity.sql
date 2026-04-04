-- FinShield AI — Supabase Migration 002
-- Transaction Integrity & Fraud Ring Prevention Schema
-- Run in: Supabase SQL Editor → New Query → Run
--
-- Context: Pivoted from identity/login security to post-login
-- transaction fraud detection (UPI/GPay context).
-- These tables power the GNN Transaction Risk Feed and Federation Mesh.

-- ──────────────────────────────────────────────────────────────────────────────
-- 1. UPI Transactions — core transaction table
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.upi_transactions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id          TEXT NOT NULL UNIQUE,
    from_account            TEXT NOT NULL,
    to_account              TEXT NOT NULL,
    amount                  NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    currency                TEXT NOT NULL DEFAULT 'INR',
    channel                 TEXT NOT NULL DEFAULT 'UPI',  -- UPI | NEFT | RTGS | IMPS

    -- GNN Node Features (computed at transaction time)
    avg_transaction_value           NUMERIC(15, 2),
    frequency_of_new_beneficiaries  NUMERIC(5, 4),        -- 0.0-1.0
    beneficiary_account_age_days    INTEGER,
    sender_account_age_days         INTEGER,
    hub_spoke_score                 NUMERIC(5, 4),         -- 0.0-1.0 from GNN

    -- AI Triage output
    gnn_risk_score          NUMERIC(5, 4) DEFAULT 0.0,
    fraud_classification    TEXT DEFAULT 'Benign',         -- APP Fraud | Money Mule | Transaction Smurfing | Hub-and-Spoke | Benign
    transaction_action      TEXT DEFAULT 'approve',        -- freeze_transfer | step_up_mfa | honeypot_escrow | flag_reversal | alert_compliance | approve
    gemini_reasoning        TEXT,
    gemini_confidence       NUMERIC(5, 4),
    analyst_notes           TEXT,

    -- Status tracking
    is_mule_suspect         BOOLEAN DEFAULT FALSE,
    is_frozen               BOOLEAN DEFAULT FALSE,
    ring_id                 TEXT,                          -- FK to mule_rings if detected
    freeze_reason           TEXT,
    frozen_at               TIMESTAMPTZ,

    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for GNN queries (ring detection requires fast lookups)
CREATE INDEX IF NOT EXISTS idx_upi_txn_to_account       ON public.upi_transactions (to_account);
CREATE INDEX IF NOT EXISTS idx_upi_txn_from_account     ON public.upi_transactions (from_account);
CREATE INDEX IF NOT EXISTS idx_upi_txn_risk_score       ON public.upi_transactions (gnn_risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_upi_txn_ring_id          ON public.upi_transactions (ring_id);
CREATE INDEX IF NOT EXISTS idx_upi_txn_classification   ON public.upi_transactions (fraud_classification);
CREATE INDEX IF NOT EXISTS idx_upi_txn_created_at       ON public.upi_transactions (created_at DESC);

-- Row Level Security
ALTER TABLE public.upi_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access" ON public.upi_transactions
    FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Authenticated read own transactions" ON public.upi_transactions
    FOR SELECT USING (
        auth.uid() IS NOT NULL
        AND (from_account = auth.uid()::TEXT OR to_account = auth.uid()::TEXT)
    );

-- ──────────────────────────────────────────────────────────────────────────────
-- 2. Mule Rings — detected money mule ring clusters
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.mule_rings (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ring_id             TEXT NOT NULL UNIQUE,
    exit_wallet         TEXT NOT NULL,                -- The hub/exit account
    relay_accounts      TEXT[] DEFAULT '{}',          -- Spoke/relay accounts
    total_volume        NUMERIC(15, 2) DEFAULT 0,
    total_transactions  INTEGER DEFAULT 0,
    currency            TEXT DEFAULT 'INR',
    risk_score          NUMERIC(5, 4) NOT NULL,
    attack_type         TEXT DEFAULT 'Hub-and-Spoke', -- Hub-and-Spoke | Fan-Out-Fan-In | Smurfing
    status              TEXT DEFAULT 'active',         -- active | frozen | resolved | false_positive
    banks_affected      TEXT[] DEFAULT '{}',
    federation_broadcast BOOLEAN DEFAULT FALSE,        -- Whether signature was shared via F6
    ring_signature      TEXT,                          -- SHA-256 anon graph signature for federation
    detected_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    frozen_at           TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mule_rings_status        ON public.mule_rings (status);
CREATE INDEX IF NOT EXISTS idx_mule_rings_risk_score    ON public.mule_rings (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_mule_rings_exit_wallet   ON public.mule_rings (exit_wallet);

ALTER TABLE public.mule_rings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access mule rings" ON public.mule_rings
    FOR ALL USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 3. Frozen Accounts — Kill Chain freeze log
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.frozen_accounts (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id      TEXT NOT NULL UNIQUE,
    bank_id         TEXT,
    freeze_reason   TEXT NOT NULL,
    ring_id         TEXT REFERENCES public.mule_rings (ring_id),
    risk_score      NUMERIC(5, 4),
    frozen_by       TEXT DEFAULT 'finshield_gnn',    -- finshield_gnn | compliance_officer | federation
    frozen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    unfrozen_at     TIMESTAMPTZ,
    status          TEXT DEFAULT 'frozen'            -- frozen | under_review | unfrozen
);

CREATE INDEX IF NOT EXISTS idx_frozen_accounts_status ON public.frozen_accounts (status);

ALTER TABLE public.frozen_accounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access frozen" ON public.frozen_accounts
    FOR ALL USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 4. Federation Rounds — Fraud Ring Signature sharing log
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.federation_rounds (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    round_id            TEXT NOT NULL UNIQUE,
    triggered_by        TEXT NOT NULL,                -- bank_id that triggered this round
    trigger_reason      TEXT NOT NULL,
    fraud_pattern       TEXT,                          -- app_fraud_ring | hub_and_spoke | smurfing
    ring_id             TEXT,
    ring_signature      TEXT,                          -- anonymized SHA-256 graph signature
    participating_banks TEXT[] DEFAULT '{}',
    banks_reported      INTEGER DEFAULT 0,
    total_banks         INTEGER DEFAULT 0,
    model_version       TEXT,
    status              TEXT DEFAULT 'in_progress',   -- in_progress | completed | failed
    customer_records_shared INTEGER DEFAULT 0,         -- ALWAYS 0 — privacy guarantee
    privacy_guarantee   TEXT DEFAULT 'DP ε=2.1 + Secure Aggregation',
    started_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at        TIMESTAMPTZ,
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_federation_rounds_status     ON public.federation_rounds (status);
CREATE INDEX IF NOT EXISTS idx_federation_rounds_started_at ON public.federation_rounds (started_at DESC);

ALTER TABLE public.federation_rounds ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access federation" ON public.federation_rounds
    FOR ALL USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 5. Triage Events — Gemini F4 Transaction Triage log
-- ──────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.triage_events (
    id                          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id              TEXT NOT NULL,
    amount                      NUMERIC(15, 2),
    channel                     TEXT DEFAULT 'UPI',
    fraud_classification        TEXT NOT NULL,
    confidence                  NUMERIC(5, 4) NOT NULL,
    risk_score                  NUMERIC(5, 4) NOT NULL,
    transaction_action          TEXT NOT NULL,
    reasoning_summary           TEXT,
    analyst_notes               TEXT,
    gemini_model                TEXT DEFAULT 'gemini-2.5-flash',
    latency_ms                  INTEGER,
    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_triage_events_classification ON public.triage_events (fraud_classification);
CREATE INDEX IF NOT EXISTS idx_triage_events_risk_score     ON public.triage_events (risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_triage_events_created_at     ON public.triage_events (created_at DESC);

ALTER TABLE public.triage_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role full access triage" ON public.triage_events
    FOR ALL USING (auth.role() = 'service_role');

-- ──────────────────────────────────────────────────────────────────────────────
-- 6. Realtime — Enable for live Transaction Risk Feed WebSocket
-- ──────────────────────────────────────────────────────────────────────────────
ALTER PUBLICATION supabase_realtime ADD TABLE public.upi_transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mule_rings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.frozen_accounts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.triage_events;

-- ──────────────────────────────────────────────────────────────────────────────
-- 7. auto-update updated_at trigger
-- ──────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_upi_transactions_updated_at
    BEFORE UPDATE ON public.upi_transactions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_mule_rings_updated_at
    BEFORE UPDATE ON public.mule_rings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_federation_rounds_updated_at
    BEFORE UPDATE ON public.federation_rounds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
