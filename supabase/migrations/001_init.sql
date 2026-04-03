-- ============================================================
-- FinShield AI — 001_init.sql
-- Run this entire file in the Supabase SQL Editor
-- Project: ytdegctfyqwhhbdzzzyo.supabase.co
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_net";     -- for outbound HTTP (webhooks)

-- ============================================================
-- TABLE: sessions
-- Stores one row per browser/app session
-- ============================================================
CREATE TABLE IF NOT EXISTS sessions (
  id                 uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            text         NOT NULL,
  bank_id            text         NOT NULL,
  ip_address         inet,
  geo_country        text,
  geo_city           text,
  lat                float8,
  lng                float8,
  device_fingerprint text,
  user_agent         text,
  started_at         timestamptz  NOT NULL DEFAULT now(),
  ended_at           timestamptz,
  is_bot             boolean      NOT NULL DEFAULT false,
  bot_confidence     float4       CHECK (bot_confidence >= 0 AND bot_confidence <= 1),
  is_honeypotted     boolean      NOT NULL DEFAULT false,
  mitigation_action  text         CHECK (
    mitigation_action IS NULL OR
    mitigation_action IN ('redirect_to_honeypot', 'step_up_mfa', 'terminate', 'allow')
  )
);

-- ============================================================
-- TABLE: biometric_events
-- Raw browser biometric telemetry, FK → sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS biometric_events (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id   uuid        NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  ts           timestamptz NOT NULL DEFAULT now(),
  event_type   text        NOT NULL CHECK (
    event_type IN ('keydown', 'keyup', 'mousemove', 'click', 'scroll', 'gyro')
  ),
  key_code     text,
  dwell_ms     float4,
  flight_ms    float4,
  mouse_x      float4,
  mouse_y      float4,
  mouse_speed  float4,
  scroll_delta float4,
  gyro_alpha   float4,
  gyro_beta    float4,
  gyro_gamma   float4
);

-- ============================================================
-- TABLE: threat_events
-- LLM triage output, one row per detected incident, FK → sessions
-- ============================================================
CREATE TABLE IF NOT EXISTS threat_events (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id              uuid        REFERENCES sessions(id) ON DELETE SET NULL,
  bank_id                 text        NOT NULL,
  incident_id             uuid,
  threat_classification   text,
  confidence_score        int2        CHECK (confidence_score >= 0 AND confidence_score <= 100),
  risk_severity           int2        CHECK (risk_severity >= 0 AND risk_severity <= 10),
  mitigation_action       text,
  reasoning_summary       text,
  iocs                    jsonb       DEFAULT '[]'::jsonb,
  honeypot_payloads       jsonb       DEFAULT '{}'::jsonb,
  detected_at             timestamptz NOT NULL DEFAULT now(),
  is_federated_shared     boolean     NOT NULL DEFAULT false
);

-- ============================================================
-- TABLE: mule_rings
-- GNN-detected money mule clusters (must exist before transactions FK)
-- ============================================================
CREATE TABLE IF NOT EXISTS mule_rings (
  id            uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  accounts      text[]         NOT NULL DEFAULT '{}',
  exit_wallets  text[]         NOT NULL DEFAULT '{}',
  total_amount  numeric(18,2)  NOT NULL DEFAULT 0,
  detected_at   timestamptz    NOT NULL DEFAULT now(),
  confidence    float4         CHECK (confidence >= 0 AND confidence <= 1),
  status        text           NOT NULL DEFAULT 'active' CHECK (
    status IN ('active', 'resolved', 'false_positive')
  )
);

-- ============================================================
-- TABLE: transactions
-- Financial transactions, FK → sessions (nullable), mule_rings (nullable)
-- ============================================================
CREATE TABLE IF NOT EXISTS transactions (
  id             uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  from_account   text           NOT NULL,
  to_account     text           NOT NULL,
  amount         numeric(18,2)  NOT NULL,
  currency       text           NOT NULL DEFAULT 'INR',
  ts             timestamptz    NOT NULL DEFAULT now(),
  bank_id        text           NOT NULL,
  session_id     uuid           REFERENCES sessions(id) ON DELETE SET NULL,
  mule_ring_id   uuid           REFERENCES mule_rings(id) ON DELETE SET NULL,
  gnn_risk_score float4         CHECK (gnn_risk_score >= 0 AND gnn_risk_score <= 1),
  is_flagged     boolean        NOT NULL DEFAULT false
);

-- ============================================================
-- TABLE: federation_gradients
-- Internal Flower FL gradient submissions
-- ============================================================
CREATE TABLE IF NOT EXISTS federation_gradients (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  bank_id        text        NOT NULL,
  model_version  text        NOT NULL,
  gradient_hash  text        NOT NULL,
  dp_epsilon     float4,
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  applied        boolean     NOT NULL DEFAULT false
);

-- ============================================================
-- TABLE: red_team_runs
-- RL simulation attack run results
-- ============================================================
CREATE TABLE IF NOT EXISTS red_team_runs (
  id                   uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  run_type             text        NOT NULL CHECK (
    run_type IN ('proxy_rotation', 'behavior_mimic', 'timing_attack', 'api_abuse')
  ),
  success              boolean     NOT NULL,
  bypass_method        text,
  patch_recommendation text,
  reward_score         float4,
  run_at               timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- INDEXES — for dashboard query performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_threat_events_detected_at  ON threat_events  (detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_ts             ON transactions   (ts DESC);
CREATE INDEX IF NOT EXISTS idx_biometric_events_session   ON biometric_events (session_id, ts DESC);
CREATE INDEX IF NOT EXISTS idx_sessions_bank_id           ON sessions       (bank_id);
CREATE INDEX IF NOT EXISTS idx_threat_events_bank_id      ON threat_events  (bank_id);
CREATE INDEX IF NOT EXISTS idx_transactions_bank_id       ON transactions   (bank_id);
CREATE INDEX IF NOT EXISTS idx_mule_rings_status          ON mule_rings     (status);
CREATE INDEX IF NOT EXISTS idx_federation_gradients_applied ON federation_gradients (applied, submitted_at DESC);

-- ============================================================
-- ROW LEVEL SECURITY — anon read on all public tables
-- ============================================================
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE biometric_events      ENABLE ROW LEVEL SECURITY;
ALTER TABLE threat_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions          ENABLE ROW LEVEL SECURITY;
ALTER TABLE mule_rings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE federation_gradients  ENABLE ROW LEVEL SECURITY;
ALTER TABLE red_team_runs         ENABLE ROW LEVEL SECURITY;

-- anon SELECT policies
CREATE POLICY "anon_read_sessions"
  ON sessions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_biometric_events"
  ON biometric_events FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_threat_events"
  ON threat_events FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_transactions"
  ON transactions FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_mule_rings"
  ON mule_rings FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_federation_gradients"
  ON federation_gradients FOR SELECT TO anon USING (true);

CREATE POLICY "anon_read_red_team_runs"
  ON red_team_runs FOR SELECT TO anon USING (true);

-- service_role full-access policies (backend writes)
CREATE POLICY "service_all_sessions"
  ON sessions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_biometric_events"
  ON biometric_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_threat_events"
  ON threat_events FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_transactions"
  ON transactions FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_mule_rings"
  ON mule_rings FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_federation_gradients"
  ON federation_gradients FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "service_all_red_team_runs"
  ON red_team_runs FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================================
-- REALTIME — enable publication for live dashboard subscriptions
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE sessions;
ALTER PUBLICATION supabase_realtime ADD TABLE threat_events;
ALTER PUBLICATION supabase_realtime ADD TABLE transactions;
ALTER PUBLICATION supabase_realtime ADD TABLE mule_rings;

-- ============================================================
-- DONE
-- All tables, indexes, RLS policies, and realtime are configured.
-- Next step: run backend/scripts/seed_demo_data.py to populate demo data.
-- ============================================================
