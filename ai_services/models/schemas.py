"""
FinShield AI — Pydantic v2 schemas for all API contracts.

Pivoted to Transaction Integrity & Fraud Ring Prevention (GPay/UPI context).
"""

from __future__ import annotations

import uuid
from datetime import datetime
from enum import Enum
from typing import Any, Optional

from pydantic import BaseModel, Field


# ---------------------------------------------------------------------------
# Enums — Transaction Fraud (post-login GPay/UPI context)
# ---------------------------------------------------------------------------

class FraudClassification(str, Enum):
    """Transaction-level fraud types. This is NOT about hacking or bots."""
    APP_FRAUD = "APP Fraud"               # Authorized Push Payment — victim tricked into transfer
    MONEY_MULE = "Money Mule"             # Account used to relay stolen funds
    TRANSACTION_SMURFING = "Transaction Smurfing"  # Many small transfers below reporting threshold
    HUB_AND_SPOKE = "Hub-and-Spoke"       # 20+ senders → 1 exit wallet within 2h
    BENIGN = "Benign"


class TransactionAction(str, Enum):
    """Kill-chain actions triggered by the AI Triage Engine."""
    FREEZE_TRANSFER = "freeze_transfer"       # Stop the money immediately
    STEP_UP_MFA = "step_up_mfa"               # Additional auth before releasing funds
    HONEYPOT_ESCROW = "honeypot_escrow"       # Looks real to scammer, funds never leave
    FLAG_REVERSAL = "flag_reversal"           # Request regulatory reversal (APP Fraud recovery)
    ALERT_COMPLIANCE = "alert_compliance"     # Notify compliance team, allow with monitoring
    APPROVE = "approve"                        # Clean transaction, release immediately


# Legacy enums (kept for backward compat with biometric / network modules)
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
# F4 — Transaction Triage (PRIMARY ENGINE — post-login fraud detection)
# ---------------------------------------------------------------------------

class TransactionTriageInput(BaseModel):
    """
    Transaction metadata analyzed by the AI Triage Engine.
    These are the exact features the GNN node scoring uses.
    """
    transaction_id: str
    amount: float = Field(..., gt=0, description="Transfer amount in INR")
    channel: str = Field(default="UPI", description="UPI | NEFT | RTGS | IMPS")

    # GNN Node Feature 1: avg_transaction_value proxy
    sender_account_age_days: int = Field(default=365, description="Days since sender account created")

    # GNN Node Feature 2: frequency_of_new_beneficiaries
    beneficiary_account_age_days: int = Field(default=365, description="Days since beneficiary account created")
    frequency_of_new_beneficiaries: float = Field(default=0.1, ge=0.0, le=1.0, description="Fraction of transfers to first-time recipients")
    is_new_beneficiary: bool = Field(default=False, description="First transfer to this beneficiary")

    # GNN Node Feature 3: smurfing detection
    recent_transfers_to_same_beneficiary: int = Field(default=0, description="Count of transfers to same account in last 6h")

    # GNN Feature 4: hub-and-spoke score from graph analysis
    hub_spoke_score: float = Field(default=0.0, ge=0.0, le=1.0, description="GNN probability that recipient is a hub/exit wallet")

    purpose: Optional[str] = None
    additional_context: Optional[str] = None


class TransactionTriageOutput(BaseModel):
    transaction_id: str
    fraud_classification: FraudClassification
    confidence: float = Field(..., ge=0.0, le=1.0)
    risk_score: float = Field(..., ge=0.0, le=1.0)
    transaction_action: TransactionAction
    reasoning_summary: str
    timestamp: datetime
    analyst_notes: Optional[str] = None


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
# Legacy F4 — Session Triage (kept for backward compat with old endpoints)
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
# F6 — Federation (Fraud Ring Signature Sharing)
# ---------------------------------------------------------------------------

class FederationTriggerRequest(BaseModel):
    bank_id: str
    trigger_reason: str
    model_type: str = Field(default="fraud_ring_gnn", description="Type of model gradient being shared")
    ring_id: Optional[str] = Field(default=None, description="Mule ring ID that triggered this federation round")
    fraud_pattern: Optional[str] = Field(default=None, description="APP Fraud | Money Mule | Smurfing | Hub-and-Spoke")


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
    fraud_pattern: Optional[str] = None   # What fraud pattern was learned
    ring_signature: Optional[str] = None  # Anonymized graph signature of the detected ring


# ---------------------------------------------------------------------------
# F7 — GNN Transaction Fraud Detection
# ---------------------------------------------------------------------------

class GNNTransactionRequest(BaseModel):
    from_account: str
    to_account: str
    amount: float
    currency: str = "INR"
    timestamp: Optional[datetime] = None
    channel: str = "UPI"
    # Optional GNN node features (if pre-computed)
    avg_transaction_value: Optional[float] = None
    frequency_of_new_beneficiaries: Optional[float] = None
    beneficiary_account_age_days: Optional[int] = None


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
    attack_type: Optional[str] = None


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
