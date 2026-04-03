# FinShield AI 🛡️

> Multi-layer, real-time automated attack detection and deception platform built for Indian fintech & NBFC infrastructure.

## Architecture

| Layer | Technology | Port |
|-------|-----------|------|
| Frontend | Next.js 14 + TypeScript | :3000 |
| Backend (Node) | Node.js / Express | :4000 |
| AI Services | FastAPI + Python | :8000 |
| Database | Supabase (PostgreSQL + Realtime) | — |
| Cache | Redis | :6379 |

## Repo Structure

```
hack17x42m3k/
├── frontend/          # Next.js UI — dashboard, landing, visualizations
├── backend/           # Node.js REST server — auth, proxy, business logic
├── ai_services/       # FastAPI Python — all ML/AI microservices (F1–F8)
│   ├── main.py
│   ├── routers/       # biometric, network, triage, honeypot, federation, gnn, redteam
│   ├── models/        # CNN, GNN, Pydantic schemas
│   ├── agents/        # LangGraph triage + honeypot agents
│   └── scripts/       # Training, seeding, simulation
└── supabase/
    └── migrations/
        └── 001_init.sql   # Full DB schema — run in Supabase SQL Editor
```

## Quick Start

```bash
# 1. Database
# Paste supabase/migrations/001_init.sql into Supabase SQL Editor → Run

# 2. AI Services (Python)
cd ai_services
pip install -r requirements.txt
python scripts/seed_demo_data.py
uvicorn main:app --reload --port 8000

# 3. Backend (Node)
cd backend
npm install
npm run dev        # :4000

# 4. Frontend
cd frontend
npm install
cp .env.example .env.local   # fill in Supabase URL + keys
npm run dev        # :3000
```

## Features (F1–F8)

| ID | Feature | AI Tech |
|----|---------|---------|
| F1 | Biometric Bot Detection | InceptionV3 CNN |
| F3 | Network Anomaly Clustering | Sklearn / NetworkX |
| F4 | LLM Threat Triage Agent | LangGraph + Anthropic/Gemini |
| F5 | Honeypot Deception Engine | LLM + FastAPI Middleware |
| F6 | Federated Learning Mesh | Flower (flwr) + Opacus DP |
| F7 | GNN Mule Ring Detection | GraphSAGE (PyTorch Geometric) |
| F8 | RL Red Team Simulation | Custom RL loop |
