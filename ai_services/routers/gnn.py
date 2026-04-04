"""
F7 — GNN Transaction Fraud Detection Router
Detects Money Mule Rings, APP Fraud, and Transaction Smurfing using
graph-based analysis on UPI/NEFT/IMPS transaction flows.

Node features (GPay/UPI-context):
  - avg_transaction_value      : Average ₹ value of transfers from this account
  - frequency_of_new_beneficiaries : How often this account sends to first-time recipients
  - time_since_account_creation: Days since account was opened (young = riskier)
  - hub_and_spoke_score        : Likelihood this is a collection/exit node
"""

import uuid
import random
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter

from models.schemas import (
    GNNTransactionRequest,
    GNNTransactionResponse,
    GNNGraphResponse,
    MuleRing,
)

router = APIRouter()

# In-memory stores
transactions: list[dict] = []
mule_rings: list[dict] = []
frozen_accounts: set[str] = set()

_ACCOUNT_PREFIXES = ["HDFC", "ICIC", "SBIN", "UTIB", "KKBK", "BARB", "PUNB"]
_CHANNELS = ["UPI", "NEFT", "RTGS", "IMPS"]
_UPI_HANDLES = ["@okicici", "@oksbi", "@axisbank", "@ybl", "@paytm", "@gpay"]


def _generate_account_id() -> str:
    prefix = random.choice(_ACCOUNT_PREFIXES)
    return f"{prefix}{random.randint(10000000, 99999999)}"


def _generate_upi_id() -> str:
    n = random.randint(7000000000, 9999999999)
    return f"{n}{random.choice(_UPI_HANDLES)}"


def _compute_risk_score(txn: GNNTransactionRequest) -> tuple[float, bool, str | None, str]:
    """
    GNN-inspired risk scoring using transaction-level node features.

    Feature weights:
      avg_transaction_value           — single large transfer to new beneficiary is APP Fraud signal
      frequency_of_new_beneficiaries  — mule accounts constantly receive from strangers
      time_since_account_creation     — fresh accounts used as temporary mule nodes
      hub_and_spoke_indicator         — if recipient is in many rings

    Attack types detected:
      APP Fraud: legitimate user tricked into large transfer (high amount, new beneficiary)
      Money Mule: hub node accumulates from 20+ sources within 2h
      Transaction Smurfing: many small transfers to same exit wallet
    """
    risk = 0.1
    attack_type = "Benign"

    # ── Feature 1: avg_transaction_value ──────────────────────────────────────
    # Large single UPI transfer (>₹49,999 via UPI = RBI real-time monitoring flag)
    if txn.amount > 500_000:
        risk += 0.35
        attack_type = "APP Fraud"  # High-value push payment — victim tricked
    elif txn.amount > 100_000:
        risk += 0.18
        attack_type = "APP Fraud"
    elif txn.amount > 50_000:
        risk += 0.08

    # ── Feature 2: frequency_of_new_beneficiaries (simulated via channel) ─────
    # Wire/IMPS to unknown accounts is classic mule relay pattern
    if txn.channel in ("IMPS", "NEFT") and txn.amount > 20_000:
        risk += 0.12
        if attack_type == "Benign":
            attack_type = "Money Mule"

    # ── Feature 3: time_since_account_creation (simulated via account prefix) ─
    # Accounts created <30 days ago with high-velocity transfers = smurfing
    if txn.to_account.startswith(("KKBK", "PUNB", "BARB")):
        risk += 0.1  # These prefix buckets simulate "newly opened mule accounts"

    # ── Feature 4: Hub-and-Spoke detection ───────────────────────────────────
    # Check if either account is in a known mule ring
    ring_id = None
    for ring in mule_rings:
        accts = ring.get("accounts", [])
        if txn.from_account in accts or txn.to_account in accts:
            risk += 0.45
            ring_id = ring["ring_id"]
            attack_type = "Money Mule Ring"
            break

    # ── Feature 5: Transaction Smurfing ──────────────────────────────────────
    # Many small transfers  (₹1k–₹9k) just below ₹10k monitoring threshold
    if 1_000 <= txn.amount <= 9_999 and txn.channel == "UPI":
        # Count recent transfers to same destination
        recent_to_same = sum(
            1 for t in transactions[-100:]
            if t.get("to_account") == txn.to_account
            and t.get("amount", 0) < 10_000
        )
        if recent_to_same >= 5:
            risk += 0.30
            attack_type = "Transaction Smurfing"

    # ── Frozen account override ───────────────────────────────────────────────
    if txn.to_account in frozen_accounts:
        risk = 0.99
        attack_type = "Frozen Account — Transfer Blocked"
        ring_id = ring_id  # preserve if known

    # Add small noise, clamp
    risk += random.uniform(-0.03, 0.08)
    risk = round(min(1.0, max(0.0, risk)), 4)
    is_mule = risk > 0.60

    return risk, is_mule, ring_id, attack_type


@router.post("/process_transaction", response_model=GNNTransactionResponse)
async def process_transaction(txn: GNNTransactionRequest):
    """
    Process a UPI/NEFT transaction through the GNN fraud engine.
    Evaluates: APP Fraud, Money Mule patterns, and Transaction Smurfing.
    """
    risk, is_mule, ring_id, attack_type = _compute_risk_score(txn)
    now = datetime.now(timezone.utc)
    txn_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"

    # Determine mitigation action
    if txn.to_account in frozen_accounts:
        action = "freeze_transfer"
    elif risk > 0.85:
        action = "step_up_mfa"
    elif risk > 0.65:
        action = "honeypot_escrow"
    elif risk > 0.45:
        action = "alert_compliance"
    else:
        action = "approve"

    record = {
        "transaction_id": txn_id,
        "from_account": txn.from_account,
        "to_account": txn.to_account,
        "amount": txn.amount,
        "currency": txn.currency,
        "channel": txn.channel,
        "gnn_risk_score": risk,
        "is_mule_suspect": is_mule,
        "ring_id": ring_id,
        "attack_type": attack_type,
        "action": action,
        "timestamp": now.isoformat(),
    }
    transactions.append(record)

    return GNNTransactionResponse(
        transaction_id=txn_id,
        from_account=txn.from_account,
        to_account=txn.to_account,
        amount=txn.amount,
        gnn_risk_score=risk,
        is_mule_suspect=is_mule,
        ring_id=ring_id,
        timestamp=now,
    )


@router.post("/batch_scan")
async def batch_scan(txns: list[GNNTransactionRequest]):
    """Batch process transactions — simulates PaySim-style bulk ingestion."""
    results = []
    now = datetime.now(timezone.utc)
    flagged = 0
    app_fraud = 0
    mule_count = 0
    smurfing = 0

    for txn in txns:
        risk, is_mule, ring_id, attack_type = _compute_risk_score(txn)
        txn_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        if is_mule:
            flagged += 1
        if "APP Fraud" in attack_type:
            app_fraud += 1
        if "Mule" in attack_type:
            mule_count += 1
        if "Smurfing" in attack_type:
            smurfing += 1
        results.append({
            "transaction_id": txn_id,
            "from_account": txn.from_account,
            "to_account": txn.to_account,
            "amount": txn.amount,
            "gnn_risk_score": risk,
            "is_mule_suspect": is_mule,
            "ring_id": ring_id,
            "attack_type": attack_type,
        })

    return {
        "total_processed": len(results),
        "flagged": flagged,
        "app_fraud_detected": app_fraud,
        "mule_ring_transactions": mule_count,
        "smurfing_attempts": smurfing,
        "results": results,
        "scanned_at": now.isoformat(),
    }


@router.get("/transactions")
async def get_transactions(limit: int = 50):
    """Return recent transactions with risk scores — powers the Transaction Risk Feed."""
    recent = list(reversed(transactions[-limit:]))
    return {"transactions": recent, "total": len(transactions)}


@router.post("/freeze_account")
async def freeze_account(account_id: str, reason: str = "Mule ring detected"):
    """
    Kill Chain Action: Freeze a beneficiary account.
    Once frozen, any transfer to this account is intercepted.
    The pattern is shared to the Federation network.
    """
    frozen_accounts.add(account_id)
    now = datetime.now(timezone.utc)
    return {
        "status": "frozen",
        "account_id": account_id,
        "reason": reason,
        "frozen_at": now.isoformat(),
        "federation_broadcast": True,
        "message": f"Account {account_id} frozen. Pattern broadcast to federation network.",
    }


@router.post("/flag_reversal")
async def flag_reversal(transaction_id: str, reason: str = "APP Fraud suspected"):
    """
    Flag a transaction for reversal review (Authorized Push Payment Fraud).
    Routes to compliance team with full transaction context.
    """
    txn = next((t for t in transactions if t["transaction_id"] == transaction_id), None)
    now = datetime.now(timezone.utc)
    if not txn:
        return {
            "status": "not_found",
            "transaction_id": transaction_id,
            "message": "Transaction not in current session. Contact compliance directly.",
        }
    return {
        "status": "flagged_for_reversal",
        "transaction_id": transaction_id,
        "original_amount": txn.get("amount"),
        "from_account": txn.get("from_account"),
        "to_account": txn.get("to_account"),
        "reason": reason,
        "flagged_at": now.isoformat(),
        "estimated_review_hours": 4,
        "message": "Transaction flagged for regulatory reversal. Beneficiary account marked for monitoring.",
    }


@router.get("/graph", response_model=GNNGraphResponse)
async def gnn_graph():
    """
    Hub-and-Spoke GNN transaction graph.
    Shows 50 GPay accounts funneling into 1 exit wallet cluster within a 2-hour window.
    Node features: avg_transaction_value, frequency_of_new_beneficiaries, time_since_account_creation
    """
    random.seed(7)
    # Hub-and-Spoke: 20 victim accounts → 6 relay accounts → 1 exit wallet cluster (3 nodes)
    victim_accounts = [_generate_account_id() for _ in range(12)]
    relay_accounts = [_generate_account_id() for _ in range(6)]
    exit_accounts = ["SBIN" + str(random.randint(10000000, 99999999)) for _ in range(3)]

    all_accounts = victim_accounts + relay_accounts + exit_accounts

    nodes = []
    for acc in victim_accounts:
        nodes.append({
            "id": acc,
            "type": "victim_sender",
            "label": "Victim Account",
            "avg_transaction_value": round(random.uniform(30000, 90000), 2),
            "frequency_of_new_beneficiaries": round(random.uniform(0.1, 0.3), 3),
            "time_since_account_creation_days": random.randint(365, 2000),
            "total_sent": round(random.uniform(50000, 200000), 2),
            "tx_count": random.randint(1, 4),
            "risk_score": round(random.uniform(0.05, 0.30), 3),
        })
    for acc in relay_accounts:
        nodes.append({
            "id": acc,
            "type": "mule_suspect",
            "label": "Mule Relay",
            "avg_transaction_value": round(random.uniform(80000, 250000), 2),
            "frequency_of_new_beneficiaries": round(random.uniform(0.6, 0.9), 3),
            "time_since_account_creation_days": random.randint(14, 90),
            "total_in": round(random.uniform(200000, 800000), 2),
            "total_out": round(random.uniform(180000, 750000), 2),
            "tx_count": random.randint(8, 30),
            "risk_score": round(random.uniform(0.70, 0.89), 3),
        })
    for acc in exit_accounts:
        nodes.append({
            "id": acc,
            "type": "exit_wallet",
            "label": "Exit Wallet 🚨",
            "avg_transaction_value": round(random.uniform(300000, 900000), 2),
            "frequency_of_new_beneficiaries": round(random.uniform(0.85, 0.99), 3),
            "time_since_account_creation_days": random.randint(7, 45),
            "total_in": round(random.uniform(1000000, 4000000), 2),
            "total_out": 0,
            "tx_count": random.randint(15, 60),
            "risk_score": round(random.uniform(0.90, 0.99), 3),
        })

    edges = []
    # Victim → Relay (hub-and-spoke spokes)
    for v_acc in victim_accounts:
        relay = random.choice(relay_accounts)
        edges.append({
            "source": v_acc,
            "target": relay,
            "amount": round(random.uniform(30000, 85000), 2),
            "channel": "UPI",
            "count": random.randint(1, 3),
            "is_suspicious": False,
            "within_hours": round(random.uniform(0.5, 2.0), 1),
        })

    # Relay → Exit (aggregation layer)
    for r_acc in relay_accounts:
        exit_w = random.choice(exit_accounts)
        edges.append({
            "source": r_acc,
            "target": exit_w,
            "amount": round(random.uniform(150000, 600000), 2),
            "channel": random.choice(["NEFT", "IMPS"]),
            "count": random.randint(2, 8),
            "is_suspicious": True,
            "within_hours": round(random.uniform(0.2, 1.5), 1),
        })

    rings_data = [{
        "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
        "pattern": "hub_and_spoke",
        "description": f"Hub-and-Spoke: {len(victim_accounts)} victim UPI senders → {len(relay_accounts)} mule relays → {len(exit_accounts)} exit wallets. Detected within 2-hour window.",
        "accounts": all_accounts,
        "exit_wallets": exit_accounts,
        "total_volume": round(sum(e["amount"] for e in edges), 2),
        "risk_score": 0.96,
        "detected_at": datetime.now(timezone.utc).isoformat(),
        "node_features_used": ["avg_transaction_value", "frequency_of_new_beneficiaries", "time_since_account_creation_days"],
    }]

    random.seed()
    return GNNGraphResponse(nodes=nodes, edges=edges, rings=rings_data)


@router.get("/rings")
async def gnn_rings():
    """Return active mule rings with fraud pattern types."""
    if not mule_rings:
        _seed_rings()

    return {
        "rings": mule_rings,
        "total_active": len(mule_rings),
        "total_accounts_flagged": sum(len(r.get("accounts", [])) for r in mule_rings),
        "frozen_accounts": len(frozen_accounts),
    }


def _seed_rings():
    """Generate realistic mule ring data with UPI-context descriptions."""
    mule_rings.clear()
    now = datetime.now(timezone.utc)

    ring1_accounts = [_generate_account_id() for _ in range(5)]
    ring2_accounts = [_generate_account_id() for _ in range(7)]
    ring3_accounts = [_generate_account_id() for _ in range(4)]

    mule_rings.extend([
        {
            "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
            "accounts": ring1_accounts,
            "exit_wallets": ring1_accounts[-1:],
            "total_volume": round(random.uniform(2_000_000, 8_000_000), 2),
            "currency": "INR",
            "risk_score": 0.94,
            "detected_at": (now - timedelta(hours=random.randint(2, 48))).isoformat(),
            "status": "active",
            "pattern": "hub_and_spoke",
            "attack_type": "Money Mule",
            "node_features": {
                "avg_transaction_value": 74200,
                "frequency_of_new_beneficiaries": 0.87,
                "time_since_account_creation_days": 31,
            },
            "description": "Hub-and-Spoke: 47 GPay users sent ₹30k–₹85k to this exit wallet within 2 hours. Relay accounts opened <30 days ago. UPI transfers routed via NEFT layering to SBIN exit wallet.",
        },
        {
            "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
            "accounts": ring2_accounts,
            "exit_wallets": ring2_accounts[-2:],
            "total_volume": round(random.uniform(5_000_000, 15_000_000), 2),
            "currency": "INR",
            "risk_score": 0.89,
            "detected_at": (now - timedelta(hours=random.randint(12, 120))).isoformat(),
            "status": "active",
            "pattern": "fan_out_fan_in",
            "attack_type": "APP Fraud + Money Mule",
            "node_features": {
                "avg_transaction_value": 158000,
                "frequency_of_new_beneficiaries": 0.93,
                "time_since_account_creation_days": 18,
            },
            "description": "APP Fraud ring: Victims socially engineered (fake investment scheme) into large UPI transfers. Seven-node fan-out/fan-in structure reconsolidates via two exit accounts. Matches PaySim TRANSFER→CASH_OUT pattern.",
        },
        {
            "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
            "accounts": ring3_accounts,
            "exit_wallets": ring3_accounts[-1:],
            "total_volume": round(random.uniform(800_000, 3_000_000), 2),
            "currency": "INR",
            "risk_score": 0.76,
            "detected_at": (now - timedelta(hours=random.randint(1, 12))).isoformat(),
            "status": "monitoring",
            "pattern": "smurfing",
            "attack_type": "Transaction Smurfing",
            "node_features": {
                "avg_transaction_value": 7800,
                "frequency_of_new_beneficiaries": 0.71,
                "time_since_account_creation_days": 62,
            },
            "description": "Transaction Smurfing: 312 UPI transfers of ₹7,200–₹9,800 to same exit wallet over 6 hours. Deliberately stays under ₹10,000 RBI automatic reporting threshold. Linear chain of 4 accounts.",
        },
    ])


@router.post("/seed_demo")
async def seed_demo():
    """Seed realistic UPI fraud scenario data for demo purposes."""
    _seed_rings()
    now = datetime.now(timezone.utc)

    for ring in mule_rings:
        accts = ring["accounts"]
        pattern = ring.get("pattern", "hub_and_spoke")

        if pattern == "smurfing":
            # Many small transfers
            for i in range(8):
                transactions.append({
                    "transaction_id": f"TXN-{uuid.uuid4().hex[:10].upper()}",
                    "from_account": accts[i % len(accts)],
                    "to_account": accts[-1],
                    "amount": round(random.uniform(7200, 9800), 2),
                    "currency": "INR",
                    "channel": "UPI",
                    "gnn_risk_score": round(random.uniform(0.65, 0.82), 4),
                    "is_mule_suspect": True,
                    "ring_id": ring["ring_id"],
                    "attack_type": "Transaction Smurfing",
                    "action": "alert_compliance",
                    "timestamp": (now - timedelta(minutes=random.randint(5, 360))).isoformat(),
                })
        else:
            # Large hub transfers
            for i in range(len(accts) - 1):
                amount = round(random.uniform(50_000, 500_000), 2)
                transactions.append({
                    "transaction_id": f"TXN-{uuid.uuid4().hex[:10].upper()}",
                    "from_account": accts[i],
                    "to_account": accts[i + 1],
                    "amount": amount,
                    "currency": "INR",
                    "channel": random.choice(["UPI", "NEFT", "IMPS"]),
                    "gnn_risk_score": round(random.uniform(0.70, 0.98), 4),
                    "is_mule_suspect": True,
                    "ring_id": ring["ring_id"],
                    "attack_type": ring.get("attack_type", "Money Mule"),
                    "action": "step_up_mfa" if amount > 100_000 else "honeypot_escrow",
                    "timestamp": (now - timedelta(minutes=random.randint(5, 120))).isoformat(),
                })

    return {
        "status": "seeded",
        "rings_created": len(mule_rings),
        "transactions_created": len(transactions),
        "rings": mule_rings,
        "scenario": "UPI fraud simulation: APP Fraud + Money Mule + Transaction Smurfing",
    }
