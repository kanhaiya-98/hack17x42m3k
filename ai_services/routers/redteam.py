"""
F8 — Red Team Simulation Router
Automated adversarial testing with Gemini-powered patch recommendations.
"""

import os
import json
import uuid
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter

from models.schemas import RedTeamRun

router = APIRouter()

# In-memory run history
run_history: list[dict] = []

# Gemini client (lazy init)
_gemini_model = None


def _get_gemini_model():
    global _gemini_model
    if _gemini_model is not None:
        return _gemini_model
    api_key = os.environ.get("GOOGLE_API_KEY")
    if not api_key:
        return None
    try:
        import google.generativeai as genai
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.5-flash")
        return _gemini_model
    except Exception as e:
        print(f"[F8] Gemini init failed: {e}")
        return None


_ATTACK_TYPES = [
    {
        "name": "Credential Stuffing via Headless Chrome",
        "category": "bot",
        "fallback_patch": "Upgrade biometric model to detect Puppeteer-specific timing signatures. Add canvas fingerprint entropy check.",
    },
    {
        "name": "Low-and-Slow DDoS (HTTP/2 Multiplexing)",
        "category": "ddos",
        "fallback_patch": "Implement per-fingerprint concurrent stream limits. Deploy HTTP/2 SETTINGS frame anomaly detection.",
    },
    {
        "name": "Session Token Replay Attack",
        "category": "session_hijack",
        "fallback_patch": "Bind session tokens to TLS channel via Token Binding (RFC 8471). Implement sliding window nonce validation.",
    },
    {
        "name": "Adversarial Biometric Evasion (GAN-generated keystrokes)",
        "category": "evasion",
        "fallback_patch": "Add second-order derivative analysis to biometric CNN. Implement temporal coherence validation.",
    },
    {
        "name": "API Parameter Tampering (IDOR)",
        "category": "api_abuse",
        "fallback_patch": "Enforce server-side authorization checks on all account-scoped endpoints. Implement HMAC-signed resource identifiers.",
    },
    {
        "name": "SQL Injection via Unicode Normalization",
        "category": "injection",
        "fallback_patch": "Apply NFKC Unicode normalization before WAF inspection. Update parameterized query layer.",
    },
    {
        "name": "Mule Account Graph Obfuscation",
        "category": "fraud",
        "fallback_patch": "Increase GNN depth to 4 layers for detecting longer transaction chains. Add temporal attention to edge features.",
    },
    {
        "name": "Federated Learning Gradient Poisoning",
        "category": "ml_attack",
        "fallback_patch": "Implement Krum Byzantine-resilient aggregation. Add gradient norm clipping with adaptive threshold.",
    },
    {
        "name": "Cookie Tossing / Session Fixation",
        "category": "session_hijack",
        "fallback_patch": "Set __Host- prefix on session cookies. Regenerate session ID on every privilege level change.",
    },
    {
        "name": "Automated OTP Brute Force",
        "category": "brute_force",
        "fallback_patch": "Implement exponential backoff with jitter on OTP attempts. Add device-binding to OTP validation.",
    },
]


async def _gemini_patch_recommendation(attack_name: str, attack_category: str, bypass_details: dict) -> str | None:
    """Use Gemini to generate a specific, actionable patch recommendation."""
    model = _get_gemini_model()
    if model is None:
        return None

    try:
        prompt = f"""You are a senior security engineer at an Indian fintech company running FinShield AI.
An automated red team agent successfully bypassed the detection system using this attack:

Attack Type: {attack_name}
Category: {attack_category}
Evasion Techniques Used: {', '.join(bypass_details.get('evasion_techniques', []))}
Payload Variants Tested: {bypass_details.get('payload_variants_tested', 'unknown')}

Generate a specific, actionable patch recommendation in 2-3 sentences.
Include: the exact code/config change needed, which defense layer to update (biometric CNN, GNN, WAF, rate limiter, etc.),
and the expected improvement in detection rate.

Reply with ONLY the recommendation text, no markdown formatting."""

        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.3, "max_output_tokens": 8192},
        )
        return response.text.strip()
    except Exception as e:
        print(f"[F8] Gemini patch rec error: {e}")
        return None


@router.get("/runs")
async def redteam_runs():
    """Return red team run history."""
    if not run_history:
        now = datetime.now(timezone.utc)
        for i in range(8):
            attack = random.choice(_ATTACK_TYPES)
            outcome = "blocked" if random.random() < 0.85 else "bypassed"
            run_history.append({
                "run_id": str(uuid.uuid4()),
                "attack_type": attack["name"],
                "attack_category": attack["category"],
                "outcome": outcome,
                "confidence": round(random.uniform(0.75, 0.98), 3),
                "patch_recommendation": attack["fallback_patch"] if outcome == "bypassed" else None,
                "started_at": (now - timedelta(hours=random.randint(1, 168))).isoformat(),
                "duration_ms": random.randint(800, 12000),
                "defense_layer_tested": random.choice(["biometric_cnn", "network_clustering", "waf", "gnn_fraud", "rate_limiter"]),
            })

    return {
        "runs": run_history,
        "total_runs": len(run_history),
        "blocked_rate": round(sum(1 for r in run_history if r["outcome"] == "blocked") / max(len(run_history), 1), 3),
    }


@router.post("/simulate")
async def redteam_simulate():
    """Run one adversarial simulation step with AI-powered patch recommendations."""
    attack = random.choice(_ATTACK_TYPES)
    outcome = "blocked" if random.random() < 0.85 else "bypassed"
    now = datetime.now(timezone.utc)
    duration = random.randint(800, 12000)

    evasion_techniques = random.sample(
        ["encoding_bypass", "timing_jitter", "header_spoofing", "fragment_reassembly",
         "protocol_downgrade", "unicode_substitution", "null_byte_injection",
         "polymorphic_payload", "request_smuggling"],
        k=random.randint(1, 4),
    )

    details = {
        "payload_variants_tested": random.randint(10, 200),
        "evasion_techniques": evasion_techniques,
        "detection_latency_ms": random.randint(50, 3000) if outcome == "blocked" else None,
    }

    # Get AI patch recommendation for bypasses
    patch = None
    if outcome == "bypassed":
        patch = await _gemini_patch_recommendation(attack["name"], attack["category"], details)
        if patch is None:
            patch = attack["fallback_patch"]

    run = {
        "run_id": str(uuid.uuid4()),
        "attack_type": attack["name"],
        "attack_category": attack["category"],
        "outcome": outcome,
        "confidence": round(random.uniform(0.75, 0.98), 3),
        "patch_recommendation": patch,
        "started_at": now.isoformat(),
        "duration_ms": duration,
        "defense_layer_tested": random.choice(["biometric_cnn", "network_clustering", "waf", "gnn_fraud", "rate_limiter"]),
        "details": details,
    }
    run_history.append(run)

    return run
