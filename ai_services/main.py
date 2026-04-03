"""
FinShield AI — FastAPI AI Services
Runs on :8000, separate from the Node.js backend server.
All ML inference, LangGraph agents, and cybersecurity logic lives here.
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Routers (uncomment as each feature is built)
# from routers import biometric, network, triage, honeypot, federation, gnn, redteam

app = FastAPI(
    title="FinShield AI Services",
    description="AI/ML microservices for biometric auth, threat triage, GNN fraud detection, and more.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],   # tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# app.include_router(biometric.router,   prefix="/api/biometric",   tags=["F1 Biometric"])
# app.include_router(network.router,     prefix="/api/network",     tags=["F3 Network"])
# app.include_router(triage.router,      prefix="/api/triage",      tags=["F4 Triage"])
# app.include_router(honeypot.router,    prefix="/api/honeypot",    tags=["F5 Honeypot"])
# app.include_router(federation.router,  prefix="/api/federation",  tags=["F6 Federation"])
# app.include_router(gnn.router,         prefix="/api/gnn",         tags=["F7 GNN"])
# app.include_router(redteam.router,     prefix="/api/redteam",     tags=["F8 RedTeam"])


@app.get("/health")
def health():
    return {"status": "ok", "service": "FinShield AI Services"}
