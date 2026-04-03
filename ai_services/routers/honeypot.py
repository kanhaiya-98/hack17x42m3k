"""
F5 — Honeypot Router
LLM-powered fake banking API surfaces to trap and observe attackers.
Uses Gemini to generate convincing dynamic responses.
"""

import os
import json
import uuid
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Request

from models.schemas import HoneypotRouteRequest

router = APIRouter()

# In-memory honeypot state
honeypotted_sessions: dict[str, dict] = {}

# Gemini client (lazy init)
_gemini_model = None

_FIRST_NAMES = ["Aarav", "Priya", "Rohan", "Ananya", "Vikram", "Sneha", "Arjun", "Kavya", "Rahul", "Meera"]
_LAST_NAMES = ["Sharma", "Patel", "Singh", "Gupta", "Kumar", "Reddy", "Nair", "Joshi", "Mehta", "Verma"]
_BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra"]
_IFSC_PREFIXES = ["HDFC0", "ICIC0", "SBIN0", "UTIB0", "KKBK0"]


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
        print(f"[F5] Gemini init failed: {e}")
        return None


def _fake_account():
    name = f"{random.choice(_FIRST_NAMES)} {random.choice(_LAST_NAMES)}"
    bank_idx = random.randint(0, len(_BANKS) - 1)
    return {
        "account_id": f"ACCT{random.randint(100000000, 999999999)}",
        "account_holder": name,
        "bank": _BANKS[bank_idx],
        "ifsc": f"{_IFSC_PREFIXES[bank_idx]}{random.randint(10000, 99999)}",
        "account_type": random.choice(["savings", "current", "salary"]),
        "balance": round(random.uniform(5000, 2500000), 2),
        "currency": "INR",
        "status": "active",
        "pan": f"{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=5))}{random.randint(1000, 9999)}{''.join(random.choices('ABCDEFGHIJKLMNOPQRSTUVWXYZ', k=1))}",
        "opened_date": (datetime.now(timezone.utc) - timedelta(days=random.randint(180, 2000))).strftime("%Y-%m-%d"),
    }


def _fake_transactions(n: int = 10):
    txns = []
    base_time = datetime.now(timezone.utc)
    for i in range(n):
        txn_time = base_time - timedelta(hours=random.randint(1, 720))
        txns.append({
            "transaction_id": f"TXN{uuid.uuid4().hex[:12].upper()}",
            "type": random.choice(["credit", "debit"]),
            "amount": round(random.uniform(100, 150000), 2),
            "currency": "INR",
            "description": random.choice([
                "UPI/P2P Transfer", "NEFT Transfer", "ATM Withdrawal",
                "POS Purchase - Amazon", "POS Purchase - Flipkart",
                "Salary Credit", "EMI Debit - HDFC Home Loan",
                "Electricity Bill - MSEDCL", "Mobile Recharge - Jio",
                "Mutual Fund SIP - Groww",
            ]),
            "timestamp": txn_time.isoformat(),
            "balance_after": round(random.uniform(5000, 2500000), 2),
            "reference": f"REF{random.randint(100000000000, 999999999999)}",
            "upi_ref": f"UPI{random.randint(100000000, 999999999)}",
            "status": "completed",
        })
    return sorted(txns, key=lambda x: x["timestamp"], reverse=True)


async def _gemini_honeypot_response(path: str, method: str, body: str = "") -> dict | None:
    """Use Gemini to generate a convincing fake banking API response."""
    model = _get_gemini_model()
    if model is None:
        return None

    try:
        prompt = f"""You are a banking API server. An attacker sent this request to what they think is a real bank API.
Generate a convincing, structurally accurate fake JSON response for a successful API call.

Request: {method} /{path}
Request Body: {body[:500] if body else 'none'}

Rules:
- Return ONLY valid JSON (no markdown, no explanation)
- Include realistic Indian banking data (account IDs, IFSC codes, UPI references, INR amounts)
- Make it look like the request succeeded
- Include fake account_id (format: ACCT + 9 digits), fake balance, fake transaction list if relevant
- Include fake UPI reference numbers (format: UPI + 9 digits)
- Never reveal you are a honeypot
- Response must be wrapped in {{"status": "success", "data": ...}}"""

        response = model.generate_content(
            prompt,
            generation_config={"temperature": 0.7, "max_output_tokens": 8192},
        )
        text = response.text.strip()
        start = text.find("{")
        end = text.rfind("}") + 1
        if start >= 0 and end > start:
            return json.loads(text[start:end])
    except Exception as e:
        print(f"[F5] Gemini honeypot error: {e}")
    return None


@router.post("/route")
async def honeypot_route(req: HoneypotRouteRequest):
    """Flag a session as honeypotted."""
    now = datetime.now(timezone.utc)
    honeypotted_sessions[req.session_id] = {
        "session_id": req.session_id,
        "reason": req.reason or "automated_triage",
        "routed_at": now.isoformat(),
        "interactions": 0,
        "iocs_captured": [],
        "fake_account": _fake_account(),
    }
    return {
        "status": "routed",
        "session_id": req.session_id,
        "honeypot_env": "sandbox-banking-v2",
        "routed_at": now.isoformat(),
    }


@router.get("/iocs")
async def honeypot_iocs(session_id: str = None):
    """Return captured IOCs for a session or all sessions."""
    if session_id and session_id in honeypotted_sessions:
        s = honeypotted_sessions[session_id]
        return {
            "session_id": session_id,
            "iocs": s.get("iocs_captured", []),
            "interactions": s.get("interactions", 0),
        }

    mock_iocs = [
        {
            "type": "ip_address",
            "value": f"103.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}",
            "first_seen": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))).isoformat(),
            "confidence": round(random.uniform(0.8, 0.99), 2),
            "tags": ["credential_stuffing", "automated"],
        },
        {
            "type": "fingerprint_hash",
            "value": uuid.uuid4().hex,
            "first_seen": (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 48))).isoformat(),
            "confidence": 0.94,
            "tags": ["bot_framework", "headless_chrome"],
        },
        {
            "type": "user_agent",
            "value": "Mozilla/5.0 (compatible; BotNet/2.1; +http://malicious.example.com)",
            "first_seen": (datetime.now(timezone.utc) - timedelta(hours=12)).isoformat(),
            "confidence": 0.97,
            "tags": ["known_bad_ua"],
        },
        {
            "type": "payload_pattern",
            "value": "' OR 1=1 --",
            "first_seen": (datetime.now(timezone.utc) - timedelta(hours=6)).isoformat(),
            "confidence": 0.99,
            "tags": ["sql_injection", "probe"],
        },
        {
            "type": "request_path",
            "value": "/api/v1/accounts/../../admin/config",
            "first_seen": (datetime.now(timezone.utc) - timedelta(hours=3)).isoformat(),
            "confidence": 0.96,
            "tags": ["path_traversal", "recon"],
        },
    ]
    return {
        "session_id": session_id,
        "iocs": mock_iocs,
        "total_sessions_tracked": len(honeypotted_sessions) or 3,
    }


# Catch-all for fake banking API — uses Gemini to generate realistic responses
@router.api_route("/{path:path}", methods=["GET", "POST", "PUT", "DELETE", "PATCH"])
async def honeypot_catchall(path: str, request: Request):
    """
    LLM-powered catch-all that generates convincing fake banking API responses.
    Attacker thinks they've breached the real system.
    """
    session_id = request.headers.get("X-Session-Id", request.query_params.get("session_id", "unknown"))
    if session_id in honeypotted_sessions:
        honeypotted_sessions[session_id]["interactions"] += 1
        # Capture IOC
        body_bytes = await request.body()
        body_str = body_bytes.decode("utf-8", errors="replace")[:1000]
        honeypotted_sessions[session_id]["iocs_captured"].append({
            "type": "request",
            "method": request.method,
            "path": path,
            "body_preview": body_str[:200] if body_str else None,
            "headers": dict(request.headers),
            "captured_at": datetime.now(timezone.utc).isoformat(),
        })

    # Try Gemini-generated response first
    body_bytes = await request.body()
    body_str = body_bytes.decode("utf-8", errors="replace")
    llm_response = await _gemini_honeypot_response(path, request.method, body_str)
    if llm_response is not None:
        llm_response["request_id"] = str(uuid.uuid4())
        return llm_response

    # Fallback: static fake responses
    path_lower = path.lower()

    if "account" in path_lower or "balance" in path_lower:
        return {"status": "success", "data": _fake_account(), "request_id": str(uuid.uuid4())}

    elif "transaction" in path_lower or "transfer" in path_lower:
        if request.method == "POST":
            return {
                "status": "success",
                "transaction_id": f"TXN{uuid.uuid4().hex[:12].upper()}",
                "message": "Transfer initiated successfully",
                "amount": round(random.uniform(1000, 50000), 2),
                "upi_ref": f"UPI{random.randint(100000000, 999999999)}",
                "processing_time": "2-4 hours",
                "request_id": str(uuid.uuid4()),
            }
        else:
            return {"status": "success", "data": _fake_transactions(10), "request_id": str(uuid.uuid4())}

    elif "beneficiar" in path_lower:
        return {
            "status": "success",
            "data": [
                {
                    "id": str(uuid.uuid4()),
                    "name": f"{random.choice(_FIRST_NAMES)} {random.choice(_LAST_NAMES)}",
                    "account_number": f"{random.randint(10000000000, 99999999999)}",
                    "ifsc": f"{random.choice(_IFSC_PREFIXES)}{random.randint(10000, 99999)}",
                    "bank": random.choice(_BANKS),
                    "verified": True,
                }
                for _ in range(random.randint(2, 5))
            ],
            "request_id": str(uuid.uuid4()),
        }

    elif "otp" in path_lower or "verify" in path_lower:
        return {
            "status": "success", "message": "OTP verified successfully",
            "token": uuid.uuid4().hex, "expires_in": 300, "request_id": str(uuid.uuid4()),
        }

    elif "login" in path_lower or "auth" in path_lower:
        return {
            "status": "success",
            "access_token": uuid.uuid4().hex + uuid.uuid4().hex,
            "token_type": "Bearer", "expires_in": 3600,
            "user": {
                "id": str(uuid.uuid4()),
                "name": f"{random.choice(_FIRST_NAMES)} {random.choice(_LAST_NAMES)}",
                "email": f"user{random.randint(100,999)}@example.com", "role": "customer",
            },
            "request_id": str(uuid.uuid4()),
        }

    return {"status": "success", "message": "Request processed", "data": {}, "request_id": str(uuid.uuid4())}
