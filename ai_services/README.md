# FinShield AI — AI Services

FastAPI-based AI/ML microservice layer. Runs on **port 8000**.  
The Node.js backend runs separately (typically port 3001/4000) and proxies AI calls here.

## Structure

```
ai_services/
├── main.py              # FastAPI app, router registration
├── requirements.txt     # Python dependencies
├── routers/             # One file per feature (F1–F8)
├── models/              # PyTorch/Keras model definitions + Pydantic schemas
├── agents/              # LangGraph & LLM agent graphs
└── scripts/             # Training, seeding, simulation scripts
```

## Quick Start

```bash
cd ai_services
pip install -r requirements.txt

# (optional) seed demo data first
python scripts/seed_demo_data.py

# start AI server
uvicorn main:app --reload --port 8000
```

## Features Hosted Here

| Router | Feature | Description |
|--------|---------|-------------|
| `/api/biometric` | F1 | InceptionV3 bot/human classifier |
| `/api/network`   | F3 | IP clustering & anomaly detection |
| `/api/triage`    | F4 | LangGraph LLM triage agent |
| `/api/honeypot`  | F5 | Deception routing + payload capture |
| `/api/federation`| F6 | Flower federated learning trigger |
| `/api/gnn`       | F7 | GraphSAGE mule ring detection |
| `/api/redteam`   | F8 | RL red team simulation |
