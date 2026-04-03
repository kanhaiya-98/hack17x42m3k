"""
FinShield AI — FastAPI AI Services
Runs on :8000, separate from the Node.js backend server.
All ML inference, LangGraph agents, and cybersecurity logic lives here.
"""

import json
import random
import asyncio
from datetime import datetime, timezone

from dotenv import load_dotenv
load_dotenv()  # Load .env file for API keys

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from routers import biometric, network, triage, honeypot, federation, gnn, redteam

app = FastAPI(
    title="FinShield AI Services",
    description="AI/ML microservices for biometric auth, threat triage, GNN fraud detection, and more.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(biometric.router, prefix="/api", tags=["F1 Biometric"])
app.include_router(network.router,   prefix="/api/network",   tags=["F3 Network"])
app.include_router(triage.router,    prefix="/api/triage",     tags=["F4 Triage"])
app.include_router(honeypot.router,  prefix="/api/honeypot",   tags=["F5 Honeypot"])
app.include_router(federation.router, prefix="/api/federation", tags=["F6 Federation"])
app.include_router(gnn.router,       prefix="/api/gnn",        tags=["F7 GNN"])
app.include_router(redteam.router,   prefix="/api/redteam",    tags=["F8 RedTeam"])

# Also mount honeypot catch-all at /honeypot for the trap endpoint
app.include_router(honeypot.router, prefix="/honeypot", tags=["F5 Honeypot Trap"], include_in_schema=False)


# ── Health ───────────────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "FinShield AI Services",
        "version": "1.0.0",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── WebSocket: live network stream ──────────────────────────────────────────
_MOCK_IPS = [
    "103.42.18.201", "185.73.99.12", "10.0.1.55", "45.33.22.100",
    "91.210.44.8", "77.105.3.91", "103.88.12.77", "172.16.0.44",
]

_EVENT_TYPES = [
    "login_attempt", "api_call", "page_view", "transaction",
    "otp_request", "password_reset", "account_lookup",
]


@app.websocket("/ws/network-stream")
async def network_stream(websocket: WebSocket):
    """Push simulated network events for the live dashboard."""
    await websocket.accept()
    try:
        while True:
            event = {
                "event_id": f"EVT-{random.randint(100000, 999999)}",
                "ip": random.choice(_MOCK_IPS),
                "event_type": random.choice(_EVENT_TYPES),
                "bot_confidence": round(random.uniform(0.0, 1.0), 3),
                "timestamp": datetime.now(timezone.utc).isoformat(),
                "session_id": f"sess-{random.randint(1000, 9999)}",
                "geo": random.choice(["Mumbai", "Shanghai", "Moscow", "Lagos", "Delhi", "Tehran"]),
                "severity": random.choice(["low", "medium", "high", "critical"]),
            }
            await websocket.send_text(json.dumps(event))
            await asyncio.sleep(random.uniform(0.5, 2.0))
    except WebSocketDisconnect:
        pass
