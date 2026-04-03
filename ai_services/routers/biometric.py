"""
F1 — Biometric Bot Detection Router
Simulates CNN-based keystroke/mouse dynamics analysis.
"""

import uuid
import random
import statistics
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException

from models.schemas import (
    BiometricEvent,
    BiometricInferResponse,
    SessionStartRequest,
    SessionStartResponse,
)

router = APIRouter()

# In-memory session store
sessions: dict[str, dict] = {}


def _analyze_biometric_events(events: list[BiometricEvent]) -> tuple[float, list[str]]:
    """
    Rule-based simulation of a CNN biometric model.
    Returns (bot_confidence, pattern_flags).
    """
    flags: list[str] = []
    scores: list[float] = []

    # --- Keystroke analysis ---
    dwell_values = [e.dwell_ms for e in events if e.dwell_ms is not None]
    flight_values = [e.flight_ms for e in events if e.flight_ms is not None]

    if len(dwell_values) >= 3:
        dwell_var = statistics.variance(dwell_values)
        if dwell_var < 5.0:
            flags.append("keystroke_dwell_too_uniform")
            scores.append(0.92)
        elif dwell_var < 15.0:
            flags.append("keystroke_dwell_low_variance")
            scores.append(0.7)
        else:
            scores.append(max(0.05, 0.3 - dwell_var / 500))

    if len(flight_values) >= 3:
        flight_var = statistics.variance(flight_values)
        if flight_var < 3.0:
            flags.append("keystroke_flight_too_uniform")
            scores.append(0.88)
        else:
            scores.append(max(0.05, 0.25 - flight_var / 600))

    # --- Mouse dynamics ---
    mouse_speeds = [e.mouse_speed for e in events if e.mouse_speed is not None]
    if len(mouse_speeds) >= 3:
        speed_var = statistics.variance(mouse_speeds)
        if speed_var < 2.0:
            flags.append("mouse_speed_constant")
            scores.append(0.90)
        elif speed_var < 10.0:
            flags.append("mouse_speed_low_variance")
            scores.append(0.65)
        else:
            scores.append(max(0.05, 0.2 - speed_var / 1000))

    # Check for perfectly linear mouse movements
    mouse_positions = [(e.mouse_x, e.mouse_y) for e in events if e.mouse_x is not None and e.mouse_y is not None]
    if len(mouse_positions) >= 5:
        dx_values = [mouse_positions[i+1][0] - mouse_positions[i][0] for i in range(len(mouse_positions)-1)]
        dy_values = [mouse_positions[i+1][1] - mouse_positions[i][1] for i in range(len(mouse_positions)-1)]
        if len(set(round(d, 1) for d in dx_values)) <= 2 and len(set(round(d, 1) for d in dy_values)) <= 2:
            flags.append("mouse_path_linear")
            scores.append(0.85)

    # --- Timing analysis ---
    timestamps = sorted([e.timestamp_ms for e in events])
    if len(timestamps) >= 5:
        intervals = [timestamps[i+1] - timestamps[i] for i in range(len(timestamps)-1)]
        if len(intervals) >= 3:
            interval_var = statistics.variance(intervals)
            if interval_var < 1.0:
                flags.append("event_timing_robotic")
                scores.append(0.95)
            elif interval_var < 5.0:
                flags.append("event_timing_suspicious")
                scores.append(0.75)

    # --- Event diversity ---
    event_types = set(e.event_type for e in events)
    if len(event_types) <= 1 and len(events) > 10:
        flags.append("low_event_diversity")
        scores.append(0.6)

    if not scores:
        # Not enough data, return moderate uncertainty
        return 0.35, ["insufficient_data"]

    bot_confidence = round(min(1.0, max(0.0, statistics.mean(scores))), 4)
    return bot_confidence, flags


@router.post("/biometric/infer", response_model=BiometricInferResponse)
async def biometric_infer(events: list[BiometricEvent], session_id: Optional[str] = None):
    """Accept biometric events array and return bot_confidence score."""
    if not events:
        raise HTTPException(status_code=400, detail="No biometric events provided")

    sid = session_id or str(uuid.uuid4())
    bot_confidence, pattern_flags = _analyze_biometric_events(events)

    # Update session if it exists
    if sid in sessions:
        sessions[sid]["bot_confidence"] = bot_confidence
        sessions[sid]["pattern_flags"] = pattern_flags

    return BiometricInferResponse(
        session_id=sid,
        bot_confidence=bot_confidence,
        pattern_flags=pattern_flags,
        timestamp=datetime.now(timezone.utc),
    )


@router.post("/session/start", response_model=SessionStartResponse)
async def session_start(req: SessionStartRequest):
    """Create a new session."""
    sid = str(uuid.uuid4())
    now = datetime.now(timezone.utc)
    sessions[sid] = {
        "session_id": sid,
        "ip": req.ip,
        "user_agent": req.user_agent,
        "fingerprint_id": req.fingerprint_id,
        "bank_id": req.bank_id,
        "created_at": now,
        "bot_confidence": 0.0,
        "pattern_flags": [],
        "status": "active",
    }
    return SessionStartResponse(
        session_id=sid,
        created_at=now,
        bank_id=req.bank_id,
        status="active",
    )


@router.get("/session/{session_id}/score")
async def session_score(session_id: str):
    """Return current session bot_confidence."""
    if session_id not in sessions:
        raise HTTPException(status_code=404, detail="Session not found")
    s = sessions[session_id]
    return {
        "session_id": session_id,
        "bot_confidence": s["bot_confidence"],
        "pattern_flags": s["pattern_flags"],
        "status": s["status"],
        "created_at": s["created_at"].isoformat(),
    }
