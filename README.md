# FinShield AI 🛡️

> **Real-time Post-Login Transaction Integrity & Fraud Ring Prevention for India's UPI ecosystem.**
>
> A production-grade AI platform that intercepts APP Fraud, Money Mule Networks, and Transaction Smurfing **between the moment a user taps "Confirm Transfer" and the moment money actually leaves the bank.** The money never moves if FinShield says it's a fraud ring.

<br>

---

## The Problem Nobody Is Solving

Every bank in India has secured the **front door** — OTPs, PINs, Face ID, device binding. Billions spent. The front door is fine.

**The robbery happens inside the house.**

Once a user is authenticated, India's banking infrastructure goes functionally blind. It checks transactions one at a time, in isolation, against static `if amount > threshold` rules written years ago. It has no visibility into the network geometry of money movement. No concept of a post-login session being hijacked. No way to see that the "legitimate user" making a transfer was coached on a phone call by a scammer 30 seconds ago.

The result is a ₹23,000 crore annual catastrophe — and it is getting worse every year.

<br>

### 📊 The Numbers Are Parliamentary Record, Not Estimates

| Metric | Figure | Source |
|--------|--------|--------|
| Total cyber fraud losses, India 2024 | **₹23,000 crore** | Outlook Money / I4C |
| UPI fraud cases, FY2023-24 | **13.42 lakh cases, ₹1,087 crore lost** | Finance Ministry, Lok Sabha, Nov 2024 |
| YoY growth in UPI fraud, FY24 vs FY23 | **↑ 85%** | Finance Ministry data tabled in Parliament |
| Digital fraud cases, Apr 2024–Jan 2025 | **24 lakh cases, ₹4,245 crore** | Rajya Sabha tabled data |
| UPI users who have faced fraud (survey) | **1 in 5 families** | LocalCircles survey, 32,000+ respondents |
| Victims who never report | **51%** | Same survey |
| India's share of global real-time transactions | **>50% by volume** | NPCI, Q1 2025 |
| UPI transactions, FY2024-25 | **185.8 billion** | NPCI Annual Data |
| Projected fraud cases FY25 | **1.1 million** | NPCI projection |

> *"If the current trend continues, annual losses may cross ₹1.2 lakh crore."* — Outlook Money, citing official projections

<br>

---

## Three Attacks That Current Systems Are Blind To

These are not theoretical. They are happening at scale, right now, with documented arrests and parliamentary disclosures.

<br>

### 🔴 Attack 1: Authorized Push Payment (APP) Fraud

**What it is:** A fully authenticated user is socially engineered — via phone, WhatsApp, or fake government portal — into voluntarily transferring money to a scammer's account.

**Why current systems miss it:** The OTP was valid. The login was real. The PIN was correct. Every authentication check passed. The bank's system has no way to distinguish "user transferring money because they want to" from "user transferring money because a scammer is on the phone telling them their account will be frozen."

**Real case:** In the first 3 months of 2024 alone, India lost ₹120.3 crore to **"digital arrest" scams** — where fraudsters impersonate CBI/ED officers, tell victims they are under "digital arrest," and demand immediate UPI transfers to avoid prosecution. The victim is authenticated, consenting, and terrified. Every bank security system in the country approved these transactions.

**Scale:** APP fraud accounts for the majority of India's ₹23,000 crore annual cyber fraud loss. The FICO 2024 Scams Impact Report found that 45% of Indian consumers believe better detection systems would be the most effective countermeasure.

<br>

### 🟠 Attack 2: Money Mule Ring Networks (Hub-and-Spoke Laundering)

**What it is:** Stolen funds are immediately distributed across dozens of "mule" accounts — bank accounts opened by students, labourers, and low-income individuals for a ₹500–₹2,000 commission. Each individual transfer is small. The accounts look clean. The ring is only visible if you look at the graph.

**Why current systems miss it:** Rule engines check each transaction individually. A ₹21,000 transfer to a new beneficiary looks fine. 47 ₹21,000 transfers from different accounts all flowing into one exit wallet within 2 hours — that's a ring. You need graph topology to see it. Banks don't have graph topology.

**Real cases — all documented:**

- An independent cyber investigator identified **4,000 mule accounts spread across 32 Indian banks**, used by Chinese betting/loan apps to launder funds. 10 of the 32 banks were government-owned. (The Wire, 2025)
- An SBI branch manager in Hyderabad was arrested in a **₹175 crore fraud** after colluding with scammers to open current accounts and facilitate mule withdrawals. (August 2024)
- The Enforcement Directorate arrested a Chartered Accountant and busted **15,000 mule accounts** in a single operation.
- ED froze **110 mule bank accounts including 73 linked to UPI IDs** in a cocaine trafficking network operating via online betting platforms in Delhi-NCR. (November 2025)
- In the Rajnandgaon case, victim funds were routed into **50 mule accounts**, immediately withdrawn via UPI/cash, and converted to crypto or sent via hawala to Cambodian masterminds. **₹10 crore moved out in 2 years.** The mule recruiter charged 7–9% commission.
- Industry analysts estimate **~0.7% of all bank accounts in India are currently involved in mule transactions.** Large banks report ₹400–500 crore of mule-enabled fraud **every month.**

**The operational reality:** Mule accounts are kept active for **1–2 days maximum.** Funds are deposited and immediately transferred out via bulk payout before any bank's weekly monitoring cycle can trigger. By the time a victim files a police complaint and the bank responds, the money has bounced through 4 accounts across 3 banks and been converted to crypto.

<br>

### 🟡 Attack 3: Transaction Smurfing (Threshold Evasion)

**What it is:** Large illegal amounts are deliberately broken into dozens of small transfers that stay below RBI's ₹10,000 reporting threshold. Each individual transfer is unremarkable. The pattern is invisible unless you aggregate across accounts and time.

**Why current systems miss it:** Per-transaction rule engines cannot see structuring patterns that span multiple accounts or time windows. 60 transfers of ₹8,200 each — the same amount, to the same destination, from the same IP — looks like 60 clean transactions.

**Scale:** This is the standard laundering methodology for all large-scale fraud proceeds in India's UPI ecosystem. It is systematic, repeatable, and costs fraudsters nothing to implement.

<br>

---

## Why India Is Uniquely Vulnerable

India is not just another market with a fraud problem. It is a structurally specific crisis:

- **Scale without precedent:** India processes over **50% of the world's real-time digital transactions** — 16.99 billion UPI transactions in January 2025 alone. No other country on Earth runs real-time payments at this volume.
- **Sophistication gap:** While global markets deploy behavioral biometrics and graph-based fraud detection, adoption in India's banking sector is critically low. The RBI itself acknowledged this by launching **MuleHunter.AI** (December 2024) — an AI tool to detect mule accounts, currently deployed across only 23 banks as of December 2025.
- **The federation gap:** NPCI is *piloting* a federated AI framework. MuleHunter.AI is centralized. **No production system in India today gives Bank A the ability to protect Bank B from a ring detected 2 minutes ago — in real time, with zero PII sharing.** That is exactly what FinShield's federated mesh does.
- **Regulatory mandate with no tooling:** RBI's 2025 Zero Trust mandate requires continuous transaction monitoring. Banks are mandated to comply. The tooling to do so at production scale, affordably, does not yet exist in the Indian market.

<br>

---

## The FinShield Solution

FinShield AI is a **Zero-Trust Post-Login Transaction Integrity Platform.** It sits between the moment a user taps "Confirm Transfer" and the moment money actually moves via NEFT/UPI. Three technical pillars, working together:

```
                    ┌──────────────────────────────────────────┐
                    │         USER TAPS "CONFIRM TRANSFER"     │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │    PILLAR 1: CONTINUOUS IDENTITY          │
                    │    Behavioral Biometric CNN               │
                    │    Keystroke dwell/flight time            │
                    │    Mouse dynamics + gyroscope             │
                    │    bot_confidence score every 2s          │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │    PILLAR 2: GRAPH TRANSACTION INTEL      │
                    │    GraphSAGE GNN (PyTorch Geometric)      │
                    │    Trained on 6.3M PaySim transactions    │
                    │    Measures hub-and-spoke topology        │
                    │    gnn_risk_score per account node        │
                    └──────────────────┬───────────────────────┘
                                       │
                    ┌──────────────────▼───────────────────────┐
                    │    PILLAR 3: GEMINI AI TRIAGE             │
                    │    Gemini 2.5 Flash (JSON-enforced)       │
                    │    Classifies: APP Fraud/Mule/Smurfing    │
                    │    Issues kill chain command in <2s       │
                    └──────────────────┬───────────────────────┘
                                       │
               ┌───────────────────────┼────────────────────────┐
               ▼                       ▼                        ▼
    freeze_transfer           step_up_mfa             honeypot_escrow
    (money never moves)  (extra verification)    (appears real, held)
```

<br>

---

## Features

| ID | Feature | Technology | Status |
|----|---------|------------|--------|
| **F4** | **AI Transaction Triage** | Gemini 2.5 Flash — APP Fraud / Mule / Smurfing in <2s | ✅ Live |
| **F7** | **GNN Mule Ring Detector** | GraphSAGE on UPI transaction graph | ✅ Live |
| **F6** | **Federated Ring Signature Mesh** | Flower + Opacus DP — 8 banks, 340ms sync, ε=2.1 | ✅ Live |
| F1 | Biometric Bot Detection | InceptionV3 CNN — keystroke/mouse telemetry | ✅ Live |
| F3 | Network Anomaly Clustering | DBSCAN on IP/fingerprint graph | ✅ Live |
| F5 | Honeypot Deception Engine | LLM-generated fake bank API, IOC harvesting | ✅ Live |
| F8 | RL Red Team Agent | Continuous defense testing | ✅ Live |

<br>

---

## How the GNN Actually Detects a Mule Ring

Traditional systems ask: *"Is this transaction suspicious?"*

FinShield asks: *"What does the geometry of this account's relationships look like?"*

The GraphSAGE model scores every account node using three transaction-derived features:

```python
avg_transaction_value           # Sudden 10x spike to new beneficiary = APP Fraud signal
frequency_of_new_beneficiaries  # 47 strangers in 2h → 1 exit wallet = hub-and-spoke ring
time_since_account_creation     # Account created 12 days ago = temporary mule node
```

If a cluster of nodes all exhibit high `frequency_of_new_beneficiaries` converging on a single destination with accounts under 30 days old — that's a ring. The Louvain community detection algorithm isolates it. The GNN scores it. Gemini issues the kill chain.

**Kill Chain actions available:**

| Action | What Happens |
|--------|--------------|
| `freeze_transfer` | Payment intercepted before NEFT/UPI execution. Money never leaves. |
| `step_up_mfa` | Additional biometric challenge. Legitimate users pass. Bots and coerced users flag. |
| `honeypot_escrow` | Transfer appears successful to the attacker. Funds held for review. Attacker toolkit exposed. |
| `flag_reversal` | RBI reversal initiated for confirmed APP Fraud cases. |
| `alert_compliance` | SOC team notified, transaction allowed with monitoring. |

<br>

---

## The Federation Mechanic — What No Indian Bank Has Today

> *"When a fraud ring hits Bank A at 2:00 PM and is detected, it will attempt Bank B at 2:05 PM with a slightly modified pattern. Without federation, Bank B starts from zero."*

**The problem:** RBI and DPDP Act rules prohibit banks from sharing raw customer transaction data. This creates a critical intelligence silo. Each bank defends itself in isolation. Attackers exploit the gaps.

**The FinShield solution:**

```
1. Bank A's GNN detects mule ring: 47 GPay accounts → SBIN83921044 in 2h
2. FinShield computes:
   ring_signature = SHA256(node_degrees + velocity_pattern + topological_hash)
   — NO names, NO account numbers, NO PII of any kind
3. Gaussian noise injected: Differential Privacy (ε=2.1) applied
4. Signature broadcast to 8 partner banks via Flower FL aggregator
5. All 8 banks update local GNN weights in < 340ms
6. Same exit wallet attempted at HDFC → blocked on arrival
7. Customer PII shared with any bank: ZERO
```

This is mathematically compliant with RBI's data localization rules and the Digital Personal Data Protection (DPDP) Act 2023. A ring signature cannot be reverse-engineered to reveal individual account holder data. The only information shared is the *mathematical shape* of the fraud network.

**Validation from the regulator itself:** The RBI launched MuleHunter.AI (Dec 2024) and NPCI is piloting its own federated AI framework — proving the regulatory appetite for exactly this architecture. FinShield's federated mesh is what that framework looks like at the bank level, deployed today.

<br>

---

## System Architecture

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

**Stack:** Next.js 15 · FastAPI (Python) · Google Gemini 2.5 Flash · PyTorch Geometric (GraphSAGE) · TensorFlow/Keras (InceptionV3) · Flower Federated Learning · Opacus Differential Privacy · Supabase PostgreSQL + Realtime · PaySim (6.3M transaction training dataset)

<br>

---

## Live Demo — 3-Panel Attack Simulation

The `/demo` page runs three simultaneous panels showing the full kill chain in real time:

**Left Panel — Attacker Screen**
A React simulation of `fraud_sim.py` generating live attack payloads: APP Fraud (high-value to new beneficiary), Mule Ring (47 GPay accounts → EXIT_WALLET), and Smurfing (60× ₹8,200 transfers). These hit the real FastAPI backend.

**Center Panel — Victim Screen**
An embedded ZeroBank transfer page. Type ₹1.75 Lakh, hit confirm. A real POST fires to FastAPI, hits Gemini 2.5 Flash, gets `freeze_transfer` back, and the UI turns red in under 2 seconds.

**Right Panel — SOC Dashboard**
Live stats, GNN risk feed, federation mesh, and triage log — all updating via Supabase Realtime. Both the attacker simulation and the victim transfer appear here simultaneously.

<br>

---

## Quick Start

### 1. Database (Supabase)
```sql
-- Run in Supabase SQL Editor:
-- supabase/migrations/001_init.sql
-- supabase/migrations/002_transaction_integrity.sql
```

### 2. AI Services (FastAPI)
```bash
cd ai_services
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in GOOGLE_API_KEY, SUPABASE_URL, etc.
uvicorn main:app --reload --port 8000
```

### 3. Frontend (Next.js)
```bash
cd frontend
npm install
cp .env.example .env.local
npm run dev   # → http://localhost:3000
```

### 4. Seed Demo Data
```bash
# Seed 3 mule rings + 18 transactions via API:
curl -X POST http://localhost:8000/api/gnn/seed_demo

# Or via PaySim-style synthetic generator:
python ai_services/scripts/paysim_mapper.py --generate 200 --seed
```

<br>

---

## Demo Scripts

### Fraud Simulations
```bash
# All 3 attack types simultaneously:
python demo/fraud_sim.py

# Individual scenarios:
python demo/fraud_sim.py --scenario app_fraud    # ₹1L+ to new beneficiary
python demo/fraud_sim.py --scenario mule_ring    # 47 accounts → 1 exit wallet
python demo/fraud_sim.py --scenario smurfing     # 60× ₹8,200 below RBI threshold

python demo/fraud_sim.py --count 20 --delay 0.2
```

### PaySim Dataset Mapping
```bash
# Real 6.3M row dataset: https://www.kaggle.com/datasets/ealaxi/paysim1
python ai_services/scripts/paysim_mapper.py --file PS_20174392719.csv --limit 5000
python ai_services/scripts/paysim_mapper.py --generate 500 --seed
```

### Bot Simulation (F1 Biometric)
```bash
python demo/attack_sim.py --threads 5 --mode burst --honeypot
```

<br>

---

## API Reference

**Swagger UI:** `http://localhost:8000/docs`

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/gnn/seed_demo` | Seed 3 mule rings + 18 transactions |
| `GET` | `/api/gnn/transactions` | Live transaction fraud feed with GNN scores |
| `POST` | `/api/gnn/process_transaction` | Score a new UPI transaction in real time |
| `POST` | `/api/gnn/freeze_account` | Kill Chain: freeze + broadcast to federation |
| `POST` | `/api/triage/analyze` | Gemini classifies transaction + issues kill chain |
| `GET` | `/api/triage/history` | Last N triage decisions with reasoning |
| `POST` | `/api/federation/trigger` | Broadcast ring signature to 8 partner banks |
| `GET` | `/api/federation/signatures` | List all shared ring signatures |

<br>

---

## Why This Matters Right Now

The RBI is not waiting. In December 2024, Governor Shaktikanta Das announced MuleHunter.AI — the central bank's own attempt to solve the mule account crisis using AI. As of December 2025, it has been deployed across 23 banks. NPCI is piloting its own federated AI framework.

The regulator has confirmed the problem, confirmed the direction, and confirmed that existing rule-based systems have failed. The RBI's own words: *"The static rule-based systems used to detect mule accounts result in high false positives and longer turnaround times, causing many such accounts to remain undetected."*

FinShield AI is what the next step looks like — graph-native, LLM-triaged, federated, and deployable as middleware on top of any existing banking backend without requiring core system changes.

The infrastructure is built. The regulatory mandate exists. The losses are documented in Parliament.

**The only thing missing was the system. That's what we built.**

<br>

---

## Repo Structure

```
finshield-ai/
├── frontend/                         # Next.js 15
│   ├── src/app/dashboard/            # Mission Control, Mule Ring, AI Triage, Federation
│   ├── src/app/bank/                 # ZeroBank demo app with Kill Chain intercept
│   └── src/components/dashboard/
│       ├── TransactionRiskFeed.tsx   # Live GNN fraud feed
│       ├── MuleRingPanel.tsx         # Ring visualization + exit wallet highlight
│       ├── FederationMesh.tsx        # ReactFlow animated federation diagram
│       └── NetworkGraph.tsx          # D3.js force-directed session graph
├── ai_services/                      # FastAPI Python
│   ├── routers/
│   │   ├── gnn.py                    # Transaction-level GraphSAGE scoring
│   │   ├── triage.py                 # Gemini transaction fraud triage
│   │   └── federation.py            # Fraud ring signature sharing
│   ├── models/schemas.py             # FraudClassification, TransactionAction enums
│   ├── scripts/
│   │   └── paysim_mapper.py          # PaySim → FinShield transaction mapper
│   └── requirements.txt
├── demo/
│   ├── fraud_sim.py                  # APP Fraud / Mule Ring / Smurfing simulation
│   └── attack_sim.py                 # Bot simulation (F1 Biometric)
└── supabase/migrations/
    ├── 001_init.sql                  # Base schema
    └── 002_transaction_integrity.sql # UPI fraud tables
```

<br>

---

## References

- Finance Ministry data tabled in Lok Sabha, November 2024 — UPI fraud statistics FY22–FY25
- RBI Annual Report FY2024-25 — Digital payment fraud surge, MuleHunter.AI announcement
- RBI Governor Shaktikanta Das, Monetary Policy Statement, December 6, 2024
- NPCI — Federated AI framework pilot announcement (The420.in, August 2025)
- PwC India — *Combating Payments Fraud in India's Digital Payments Landscape*, 2025
- CloudSEK Research — *XHelper: Chinese UPI money laundering platform*, March 2024
- FICO — *2024 Scams Impact Report: India*
- LocalCircles Survey — 32,000+ UPI users, 365 districts, June 2025
- The Wire — *The Government Needs to Focus on Mule Accounts*, April 2025
- ZIGRAM — *Understanding Mule Accounts in Tier 1 and Tier 2 Cities in India*, 2025
- MediaNama RTI Response — *23 Banks Have Implemented MuleHunter.AI*, December 2025
- Enforcement Directorate press statements — mule account seizures, 2024–2025

<br>

---

<div align="center">

**FinShield AI** · Built at HackUp by Team Hackstronauts!

*Because the real attack starts after the password works.*

</div>
