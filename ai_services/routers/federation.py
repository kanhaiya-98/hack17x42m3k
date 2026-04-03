"""
F6 — Federated Learning Router
Simulates federated model training across banking partners.
"""

import uuid
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter

from models.schemas import (
    FederationTriggerRequest,
    FederationStatusResponse,
    FederationGradientRequest,
)

router = APIRouter()

# In-memory federation state
federation_rounds: dict[str, dict] = {}
gradient_submissions: list[dict] = []

_PARTNER_BANKS = [
    "HDFC Bank", "ICICI Bank", "State Bank of India",
    "Axis Bank", "Kotak Mahindra", "Bank of Baroda",
    "Punjab National Bank", "Yes Bank",
]


@router.post("/trigger")
async def federation_trigger(req: FederationTriggerRequest):
    """Trigger a new federated learning round."""
    round_id = f"FL-{uuid.uuid4().hex[:8].upper()}"
    now = datetime.now(timezone.utc)
    total_banks = random.randint(4, len(_PARTNER_BANKS))

    federation_rounds[round_id] = {
        "round_id": round_id,
        "status": "in_progress",
        "triggered_by": req.bank_id,
        "trigger_reason": req.trigger_reason,
        "model_type": req.model_type,
        "banks_reported": 1,
        "total_banks": total_banks,
        "participating_banks": random.sample(_PARTNER_BANKS, total_banks),
        "model_version": f"v2.{random.randint(10, 99)}.{random.randint(0, 9)}",
        "started_at": now.isoformat(),
        "updated_at": now.isoformat(),
        "metrics": {
            "global_accuracy": round(random.uniform(0.89, 0.96), 4),
            "avg_loss": round(random.uniform(0.02, 0.15), 4),
            "privacy_budget_epsilon": round(random.uniform(1.0, 8.0), 2),
        },
    }

    return {
        "round_id": round_id,
        "status": "in_progress",
        "message": f"Federated learning round initiated with {total_banks} banks",
        "triggered_by": req.bank_id,
        "started_at": now.isoformat(),
    }


@router.get("/status", response_model=FederationStatusResponse)
async def federation_status():
    """Return current federation status."""
    if federation_rounds:
        latest = list(federation_rounds.values())[-1]
        # Simulate progress
        reported = min(latest["total_banks"], latest["banks_reported"] + random.randint(0, 2))
        latest["banks_reported"] = reported
        if reported >= latest["total_banks"]:
            latest["status"] = "completed"
        latest["updated_at"] = datetime.now(timezone.utc).isoformat()

        return FederationStatusResponse(
            round_id=latest["round_id"],
            status=latest["status"],
            banks_reported=latest["banks_reported"],
            total_banks=latest["total_banks"],
            model_version=latest["model_version"],
            started_at=datetime.fromisoformat(latest["started_at"]),
            updated_at=datetime.fromisoformat(latest["updated_at"]),
        )

    # Default mock status
    now = datetime.now(timezone.utc)
    return FederationStatusResponse(
        round_id=f"FL-{uuid.uuid4().hex[:8].upper()}",
        status="completed",
        banks_reported=6,
        total_banks=6,
        model_version="v2.47.3",
        started_at=now - timedelta(hours=2),
        updated_at=now - timedelta(minutes=15),
    )


@router.post("/gradient")
async def federation_gradient(req: FederationGradientRequest):
    """Accept a gradient submission from a participating bank."""
    now = datetime.now(timezone.utc)

    submission = {
        "submission_id": str(uuid.uuid4()),
        "bank_id": req.bank_id,
        "round_id": req.round_id,
        "gradient_hash": req.gradient_hash,
        "num_samples": req.num_samples,
        "received_at": now.isoformat(),
        "dp_noise_applied": True,
        "clipping_norm": round(random.uniform(0.5, 2.0), 2),
    }
    gradient_submissions.append(submission)

    # Update round if exists
    if req.round_id in federation_rounds:
        federation_rounds[req.round_id]["banks_reported"] += 1
        federation_rounds[req.round_id]["updated_at"] = now.isoformat()

    return {
        "status": "accepted",
        "submission_id": submission["submission_id"],
        "round_id": req.round_id,
        "message": "Gradient accepted and privacy-preserved aggregation queued",
        "dp_noise_applied": True,
        "received_at": now.isoformat(),
    }
