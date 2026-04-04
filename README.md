# FinShield AI 🛡️

> **Real-time Transaction Integrity & Fraud Ring Prevention for Indian UPI/GPay ecosystems.**
>
> Post-login fraud detection using Graph Neural Networks, Federated Learning, and Gemini AI — targeting APP Fraud, Money Mule Networks, and Transaction Smurfing at the transaction level.

---

## Why This Problem?

Traditional fintech security stops at login. But the highest-value attacks happen **after** the user is authenticated:

| Attack | Description | Scale (India FY24) |
|--------|-------------|---------------------|
| **APP Fraud** | Victim socially engineered into sending ₹50k–₹5L to scammer | ₹1,750+ crore |
| **Money Mule Networks** | 47 GPay accounts funneling to 1 exit wallet within 2h | Billions laundered |
| **Transaction Smurfing** | Breaking ₹5L into 60× ₹8,200 UPI payments to avoid ₹10k RBI reporting | Systematic evasion |

FinShield runs **between the "Confirm Transfer" tap and actual NEFT/UPI execution**. The money never moves if the AI says it's a fraud ring.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  ZeroBank (Demo Frontend)   Next.js 15  :3000           │
│  ├── Transaction Risk Feed  (live GNN fraud alerts)     │
│  ├── Bank Transfer UI       (Kill Chain intercept demo) │
│  └── Federation Mesh        (ring signature sharing)    │
└──────────────────┬──────────────────────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────────────────────┐
│  FinShield AI Services      FastAPI + Python  :8000     │
│  ├── F4 Transaction Triage  Gemini 2.5 Flash            │
│  ├── F7 GNN Fraud Detection GraphSAGE (PyG)             │
│  ├── F6 Federated Learning  Flower + Opacus DP          │
│  ├── F5 Honeypot Engine     Mock balance/escrow API     │
│  ├── F1 Biometric Scanner   InceptionV3 CNN             │
│  └── F8 Red Team Agent      RL simulation               │
└──────────────────┬──────────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────────┐
│  Supabase (PostgreSQL + Realtime)                        │
│  ├── upi_transactions        GNN risk scores + actions  │
│  ├── mule_rings              Detected ring clusters     │
│  ├── frozen_accounts         Kill Chain log             │
│  ├── federation_rounds       Ring signature broadcast   │
│  └── triage_events           Gemini classification log  │
└─────────────────────────────────────────────────────────┘
```

---

## Features

| ID | Feature | AI/ML | Status |
|----|---------|-------|--------|
| **F4** | **AI Transaction Triage** | Gemini 2.5 Flash — classifies APP Fraud / Mule / Smurfing in <2s | ✅ Live |
| **F7** | **GNN Mule Ring Detection** | GraphSAGE on UPI transaction graph — hub-and-spoke pattern | ✅ Live |
| **F6** | **Fraud Ring Signature Federation** | Anonymized ring patterns shared across 8 banks via DP + SecAgg | ✅ Live |
| F1 | Biometric Bot Detection | InceptionV3 CNN on keystroke/mouse telemetry | ✅ Live |
| F3 | Network Anomaly Clustering | DBSCAN on IP/fingerprint graph | ✅ Live |
| F5 | Honeypot Deception Engine | Fake balance API, honeypot escrow | ✅ Live |
| F8 | RL Red Team Agent | Custom RL loop testing defenses | ✅ Live |

---

## GNN Node Features

The GNN scores each account node using 3 transaction-level features:

```python
avg_transaction_value           # High single-value to new beneficiary = APP Fraud
frequency_of_new_beneficiaries  # 47 strangers → 1 exit wallet = Hub-and-Spoke ring
time_since_account_creation     # <30 days old = temporary mule node
```

**Kill Chain Actions:**
- `freeze_transfer` — Block the money before NEFT/UPI executes
- `step_up_mfa` — Additional verification for high-value to new beneficiary
- `honeypot_escrow` — Appears real to scammer; funds held for review
- `flag_reversal` — Initiate RBI reversal for APP Fraud recovery
- `alert_compliance` — Notify SOC team, allow with monitoring

---

## Quick Start

### 1. Database (Supabase)
```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/001_init.sql        (base schema)
-- supabase/migrations/002_transaction_integrity.sql  (NEW: transaction tables)
```

### 2. AI Services (FastAPI)
```bash
cd ai_services
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt

# Copy environment variables
cp .env.example .env   # fill in GOOGLE_API_KEY, SUPABASE_URL, etc.

uvicorn main:app --reload --port 8000
```

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local   # fill in NEXT_PUBLIC_SUPABASE_URL etc.
npm run dev   # → http://localhost:3000
```

### 4. Seed Demo Data
```bash
# Via API:
curl -X POST http://localhost:8000/api/gnn/seed_demo

# Via script (synthetic PaySim-style data):
python ai_services/scripts/paysim_mapper.py --generate 200 --seed
```

---

## Demo Scripts

### Run Fraud Simulations (Terminal → Dashboard)
```bash
# All 3 attack scenarios:
python demo/fraud_sim.py

# Individual scenarios:
python demo/fraud_sim.py --scenario app_fraud    # ₹1L+ push to new beneficiary
python demo/fraud_sim.py --scenario mule_ring    # 47 GPay accounts → 1 exit wallet
python demo/fraud_sim.py --scenario smurfing     # 60× ₹8.2k below RBI threshold

# Options:
python demo/fraud_sim.py --count 20 --delay 0.2
```

### Map PaySim Real Dataset
```bash
# Download from: https://www.kaggle.com/datasets/ealaxi/paysim1
python ai_services/scripts/paysim_mapper.py --file PS_20174392719.csv --limit 5000
python ai_services/scripts/paysim_mapper.py --generate 500 --seed   # no file needed
```

### Bot Simulation (F1 Biometric)
```bash
python demo/attack_sim.py --threads 5 --mode burst --honeypot
```

---

## API Reference

**Swagger UI:** `http://localhost:8000/docs`

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/gnn/seed_demo` | Seed 3 mule rings + 18 transactions |
| GET | `/api/gnn/transactions` | Live transaction fraud feed |
| POST | `/api/gnn/process_transaction` | Score a new UPI transaction |
| POST | `/api/gnn/freeze_account` | Kill Chain: freeze + broadcast to federation |
| POST | `/api/triage/analyze` | Gemini classifies transaction (APP Fraud / Mule / Smurfing) |
| GET | `/api/triage/history` | Last N triage decisions |
| POST | `/api/federation/trigger` | Broadcast ring signature to partner banks |
| GET | `/api/federation/signatures` | List shared ring signatures |

---

## Federation: Bank A detects → Bank B protects

```
1. Bank A GNN detects exit wallet: 47 GPay senders → SBIN83921044 in 2h
2. FinShield generates ring_signature = SHA256(node_degrees + velocity_pattern)
3. Ring signature broadcast to: HDFC, ICICI, GPay, PhonePe, Axis, PNB, Yes, BOB
4. All 8 banks update local GNN in < 340ms
5. Exit wallet blocked everywhere — before ₹1 leaves any bank
6. Customer PII shared: ZERO (only anonymized mathematical gradient)
```

Privacy guarantee: **Differential Privacy (ε=2.1) + Secure Aggregation** — RBI data localization compliant.

---

## Repo Structure

```
hack17x42m3k/
├── frontend/                    # Next.js 15 — dashboard, transfer UI
│   ├── src/app/dashboard/       # Mission Control, Mule Ring, AI Triage, Federation pages
│   ├── src/app/bank/            # ZeroBank demo app with Kill Chain intercept
│   └── src/components/dashboard/
│       ├── TransactionRiskFeed.tsx   # ← NEW: live GNN fraud feed
│       ├── MuleRingPanel.tsx
│       ├── FederationMesh.tsx
│       └── NetworkGraph.tsx
├── ai_services/                 # FastAPI Python AI microservices
│   ├── routers/
│   │   ├── gnn.py               # ← PIVOTED: transaction-level GNN scoring
│   │   ├── triage.py            # ← PIVOTED: Gemini transaction fraud triage
│   │   └── federation.py        # ← PIVOTED: fraud ring signature sharing
│   ├── models/schemas.py        # FraudClassification, TransactionAction enums
│   ├── scripts/
│   │   └── paysim_mapper.py     # ← NEW: PaySim → FinShield mapper
│   └── requirements.txt
├── demo/
│   ├── fraud_sim.py             # ← NEW: APP Fraud / Mule / Smurfing simulation
│   └── attack_sim.py            # Legacy bot simulation (F1 Biometric)
└── supabase/migrations/
    ├── 001_init.sql             # Base schema
    └── 002_transaction_integrity.sql   # ← NEW: UPI fraud tables
```
