"""
F4 — AI Triage Router
Real LLM-powered threat classification using Google Gemini,
with rule-based fallback if API is unavailable.
"""

import os
import json
import uuid
import random
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException

from models.schemas import (
    TriageInput,
    TriageOutput,
    ThreatClassification,
    MitigationAction,
)

router = APIRouter()

# In-memory triage history
triage_history: list[dict] = []

# Gemini client (lazy init)
_gemini_model = None


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model

    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        print("[F4] GOOGLE_API_KEY not found in env", flush=True)
        return None

    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        print(f"[F4] Gemini model initialized successfully (key: {api_key[:10]}...)", flush=True)
        return _gemini_model
    except Exception as e:
        print(f"[F4] Gemini init failed: {type(e).__name__}: {e}", flush=True)
        return None


TRIAGE_SYSTEM_PROMPT = """You are an elite cybersecurity analyst for a financial platform (Indian fintech/NBFC).
Analyze the provided session telemetry and output ONLY a valid JSON object.
No prose, no markdown, no code fences, no explanation outside the JSON.

JSON Schema (strict):
{
  "threat_classification": "<Credential Stuffing|Low-and-Slow DDoS|Session Hijacking|Account Takeover|API Abuse|Bot Scraping|Benign>",
  "confidence": <0.0-1.0>,
  "mitigation_action": "<block_ip|rate_limit|captcha_challenge|honeypot_route|alert_only|force_mfa|terminate_session|no_action>",
  "reasoning_summary": "<2-3 sentences explaining key signals and why this classification>"
}

Weight these signals heavily:
- bot_confidence > 0.7 = likely bot
- clustering_score > 0.8 = coordinated attack
- geo_anomaly = true with velocity_flag = impossible travel
- High request velocity = automated
- Missing mouse/keyboard data = scripted input

Be specific in your reasoning. Reference actual score values and explain the attack pattern."""


async def _gemini_triage(inp: TriageInput) -> Optional[TriageOutput]:
    """Use Gemini for real AI-powered threat classification."""
    model = _get_gemini_model()
    if model is None:
        return None

    try:
        user_prompt = f"""Analyze this session telemetry:

Session ID: {inp.session_id}
Bot Confidence Score: {inp.bot_confidence}
Network Clustering Score: {inp.clustering_score}
Geographic Anomaly Detected: {inp.geo_anomaly}
Request Velocity Flag: {inp.velocity_flag}
Source IP: {inp.ip or 'unknown'}
Device Fingerprint: {inp.fingerprint_id or 'unknown'}
Additional Context: {inp.additional_context or 'none'}

Classify this threat and recommend an action. Output ONLY valid JSON."""

        response = model.generate_content(
            [TRIAGE_SYSTEM_PROMPT, user_prompt],
            generation_config={
                "temperature": 0.1,
                "max_output_tokens": 8192,
            },
        )

        text = response.text.strip()
        print(f"[F4] Gemini raw response ({len(text)} chars): {text[:500]}", flush=True)
        # Extract JSON from response
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            data = json.loads(text[start:end])

            # Map to enums safely
            classification_map = {
                "Credential Stuffing": ThreatClassification.CREDENTIAL_STUFFING,
                "Low-and-Slow DDoS": ThreatClassification.LOW_AND_SLOW_DDOS,
                "Session Hijacking": ThreatClassification.SESSION_HIJACKING,
                "Account Takeover": ThreatClassification.ACCOUNT_TAKEOVER,
                "API Abuse": ThreatClassification.API_ABUSE,
                "Bot Scraping": ThreatClassification.BOT_SCRAPING,
                "Benign": ThreatClassification.BENIGN,
            }
            action_map = {
                "block_ip": MitigationAction.BLOCK_IP,
                "rate_limit": MitigationAction.RATE_LIMIT,
                "captcha_challenge": MitigationAction.CAPTCHA_CHALLENGE,
                "honeypot_route": MitigationAction.HONEYPOT_ROUTE,
                "alert_only": MitigationAction.ALERT_ONLY,
                "force_mfa": MitigationAction.FORCE_MFA,
                "terminate_session": MitigationAction.TERMINATE_SESSION,
                "no_action": MitigationAction.NO_ACTION,
            }

            tc = classification_map.get(data.get("threat_classification", ""), ThreatClassification.BENIGN)
            ma = action_map.get(data.get("mitigation_action", ""), MitigationAction.ALERT_ONLY)

            return TriageOutput(
                session_id=inp.session_id,
                threat_classification=tc,
                confidence=round(float(data.get("confidence", 0.5)), 4),
                mitigation_action=ma,
                reasoning_summary=data.get("reasoning_summary", "AI analysis completed."),
                timestamp=datetime.now(timezone.utc),
                analyst_notes="Classification by Gemini 2.0 Flash",
            )
    except Exception as e:
        print(f"[F4] Gemini triage error: {type(e).__name__}: {e}")
        return None

    return None


def _rule_based_triage(inp: TriageInput) -> TriageOutput:
    """Deterministic rule-based triage classification (fallback)."""
    classification = ThreatClassification.BENIGN
    confidence = 0.0
    action = MitigationAction.NO_ACTION
    reasoning_parts: list[str] = []

    if inp.bot_confidence > 0.72:
        classification = ThreatClassification.CREDENTIAL_STUFFING
        confidence = min(0.98, inp.bot_confidence + 0.1)
        action = MitigationAction.HONEYPOT_ROUTE
        reasoning_parts.append(
            f"Biometric analysis returned bot_confidence={inp.bot_confidence:.2f}, "
            "exceeding the 0.72 threshold. Patterns consistent with automated credential stuffing."
        )
    elif inp.clustering_score > 0.8:
        classification = ThreatClassification.LOW_AND_SLOW_DDOS
        confidence = min(0.95, inp.clustering_score + 0.05)
        action = MitigationAction.RATE_LIMIT
        reasoning_parts.append(
            f"Clustering score {inp.clustering_score:.2f} indicates coordinated distributed attack."
        )
    elif inp.geo_anomaly and inp.velocity_flag:
        classification = ThreatClassification.SESSION_HIJACKING
        confidence = 0.87
        action = MitigationAction.TERMINATE_SESSION
        reasoning_parts.append("Impossible travel detected — session token likely compromised.")
    elif inp.geo_anomaly:
        classification = ThreatClassification.ACCOUNT_TAKEOVER
        confidence = 0.74
        action = MitigationAction.FORCE_MFA
        reasoning_parts.append("Unusual login location. Forcing MFA as precaution.")
    elif inp.velocity_flag:
        classification = ThreatClassification.API_ABUSE
        confidence = 0.68
        action = MitigationAction.RATE_LIMIT
        reasoning_parts.append("High request velocity exceeds normal human interaction patterns.")
    elif inp.bot_confidence > 0.45:
        classification = ThreatClassification.BOT_SCRAPING
        confidence = inp.bot_confidence + 0.15
        action = MitigationAction.CAPTCHA_CHALLENGE
        reasoning_parts.append(f"Moderate bot_confidence {inp.bot_confidence:.2f} suggests scraping.")
    else:
        confidence = max(0.1, 1.0 - inp.bot_confidence - inp.clustering_score)
        reasoning_parts.append("Session metrics within normal parameters. No threats detected.")

    return TriageOutput(
        session_id=inp.session_id,
        threat_classification=classification,
        confidence=round(confidence, 4),
        mitigation_action=action,
        reasoning_summary=" ".join(reasoning_parts),
        timestamp=datetime.now(timezone.utc),
    )


@router.post("/analyze", response_model=TriageOutput)
async def triage_analyze(inp: TriageInput):
    """Analyze a session and classify the threat using Gemini AI."""
    # Try Gemini first, fall back to rules
    result = await _gemini_triage(inp)
    if result is None:
        result = _rule_based_triage(inp)

    triage_history.append(result.model_dump(mode="json"))
    return result


@router.get("/history")
async def triage_get_history():
    """Return triage event history."""
    if not triage_history:
        mock_sessions = [
            {"session_id": str(uuid.uuid4()), "bot_confidence": 0.91, "clustering_score": 0.3},
            {"session_id": str(uuid.uuid4()), "bot_confidence": 0.15, "clustering_score": 0.88, "velocity_flag": True},
            {"session_id": str(uuid.uuid4()), "bot_confidence": 0.55, "clustering_score": 0.2, "geo_anomaly": True, "velocity_flag": True},
            {"session_id": str(uuid.uuid4()), "bot_confidence": 0.08, "clustering_score": 0.12},
            {"session_id": str(uuid.uuid4()), "bot_confidence": 0.82, "clustering_score": 0.65, "geo_anomaly": True},
        ]
        for m in mock_sessions:
            inp = TriageInput(**m)
            result = await _gemini_triage(inp)
            if result is None:
                result = _rule_based_triage(inp)
            triage_history.append(result.model_dump(mode="json"))

    return {"history": triage_history, "total": len(triage_history)}


@router.post("/manual")
async def triage_manual(session_id: str):
    """Run triage on a specific session."""
    from routers.biometric import sessions as bio_sessions
    from routers.network import network_sessions

    bot_confidence = 0.5
    clustering_score = 0.3
    geo_anomaly = False
    velocity_flag = False
    ip = None

    if session_id in bio_sessions:
        bot_confidence = bio_sessions[session_id].get("bot_confidence", 0.5)
        ip = bio_sessions[session_id].get("ip")

    if session_id in network_sessions:
        clustering_score = network_sessions[session_id].get("clustering_score", 0.3)

    inp = TriageInput(
        session_id=session_id,
        bot_confidence=bot_confidence,
        clustering_score=clustering_score,
        geo_anomaly=geo_anomaly,
        velocity_flag=velocity_flag,
        ip=ip,
    )
    result = await _gemini_triage(inp)
    if result is None:
        result = _rule_based_triage(inp)
    triage_history.append(result.model_dump(mode="json"))
    return result
