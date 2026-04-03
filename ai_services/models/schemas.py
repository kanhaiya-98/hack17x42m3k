"""
FinShield AI — Pydantic v2 schemas for all API contracts.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------

class ThreatClassification(str, Enum):
    CREDENTIAL_STUFFING = "Credential Stuffing"
    LOW_AND_SLOW_DDOS = "Low-and-Slow DDoS"
    SESSION_HIJACKING = "Session Hijacking"
    ACCOUNT_TAKEOVER = "Account Takeover"
    API_ABUSE = "API Abuse"
    BOT_SCRAPING = "Bot Scraping"
    BENIGN = "Benign"


class MitigationAction(str, Enum):
    BLOCK_IP = "block_ip"
    RATE_LIMIT = "rate_limit"
    CAPTCHA_CHALLENGE = "captcha_challenge"
    HONEYPOT_ROUTE = "honeypot_route"
    ALERT_ONLY = "alert_only"
    FORCE_MFA = "force_mfa"
    TERMINATE_SESSION = "terminate_session"
    NO_ACTION = "no_action"


# ---------------------------------------------------------------------------
# F1 — Biometric
# ---------------------------------------------------------------------------

class BiometricEvent(BaseModel):
    event_type: str = Field(..., description="keydown | keyup | mousemove | click | scroll")
    timestamp_ms: float
    key: Optional[str] = None
    dwell_ms: Optional[float] = None
    flight_ms: Optional[float] = None
    mouse_x: Optional[float] = None
    mouse_y: Optional[float] = None
    mouse_speed: Optional[float] = None
    scroll_delta: Optional[float] = None


class BiometricInferResponse(BaseModel):
    session_id: str
    bot_confidence: float = Field(..., ge=0.0, le=1.0)
    pattern_flags: list[str] = []
    timestamp: datetime


class SessionStartRequest(BaseModel):
    ip: str
    user_agent: str
    fingerprint_id: str
    bank_id: str


class SessionStartResponse(BaseModel):
    session_id: str
    created_at: datetime
    bank_id: str
    status: str = "active"


# ---------------------------------------------------------------------------
# F3 — Network
# ---------------------------------------------------------------------------

class NetworkIngestRequest(BaseModel):
    session_id: str
    ip: str
    fingerprint_id: str
    user_agent: Optional[str] = None
    bank_id: Optional[str] = None
    request_path: Optional[str] = None


class GeoInfo(BaseModel):
    country: str
    city: str
    lat: float
    lon: float
    asn: Optional[str] = None
    isp: Optional[str] = None


class NetworkIngestResponse(BaseModel):
    session_id: str
    geo: GeoInfo
    clustering_score: float
    stored: bool = True


# ---------------------------------------------------------------------------
# F4 — Triage
# ---------------------------------------------------------------------------

class TriageInput(BaseModel):
    session_id: str
    bot_confidence: float = Field(..., ge=0.0, le=1.0)
    clustering_score: float = Field(0.0, ge=0.0, le=1.0)
    geo_anomaly: bool = False
    velocity_flag: bool = False
    ip: Optional[str] = None
    fingerprint_id: Optional[str] = None
    additional_context: Optional[str] = None


class TriageOutput(BaseModel):
    session_id: str
    threat_classification: ThreatClassification
    confidence: float = Field(..., ge=0.0, le=1.0)
    mitigation_action: MitigationAction
    reasoning_summary: str
    timestamp: datetime
    analyst_notes: Optional[str] = None


# ---------------------------------------------------------------------------
# F5 — Honeypot
# ---------------------------------------------------------------------------

class HoneypotRouteRequest(BaseModel):
    session_id: str
    reason: Optional[str] = None


# ---------------------------------------------------------------------------
# F6 — Federation
# ---------------------------------------------------------------------------

class FederationTriggerRequest(BaseModel):
    bank_id: str
    trigger_reason: str
    model_type: str = "biometric_cnn"


class FederationStatusResponse(BaseModel):
    round_id: str
    status: str
    banks_reported: int
    total_banks: int
    model_version: str
    started_at: datetime
    updated_at: datetime


class FederationGradientRequest(BaseModel):
    bank_id: str
    round_id: str
    gradient_hash: str
    num_samples: int


# ---------------------------------------------------------------------------
# F7 — GNN
# ---------------------------------------------------------------------------

class GNNTransactionRequest(BaseModel):
    from_account: str
    to_account: str
    amount: float
    currency: str = "INR"
    timestamp: Optional[datetime] = None
    channel: str = "UPI"


class GNNTransactionResponse(BaseModel):
    transaction_id: str
    from_account: str
    to_account: str
    amount: float
    gnn_risk_score: float = Field(..., ge=0.0, le=1.0)
    is_mule_suspect: bool
    ring_id: Optional[str] = None
    timestamp: datetime


class GNNGraphResponse(BaseModel):
    nodes: list[dict[str, Any]]
    edges: list[dict[str, Any]]
    rings: list[dict[str, Any]]


class MuleRing(BaseModel):
    ring_id: str
    accounts: list[str]
    total_volume: float
    currency: str = "INR"
    risk_score: float
    detected_at: datetime
    status: str = "active"


# ---------------------------------------------------------------------------
# F8 — Red Team
# ---------------------------------------------------------------------------

class RedTeamRun(BaseModel):
    run_id: str
    attack_type: str
    outcome: str  # "blocked" | "bypassed"
    confidence: float
    patch_recommendation: Optional[str] = None
    started_at: datetime
    duration_ms: int
