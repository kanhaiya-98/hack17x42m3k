"""
F7 — GNN Fraud Detection Router
Simulates graph neural network mule ring detection.
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

_ACCOUNT_PREFIXES = ["HDFC", "ICIC", "SBIN", "UTIB", "KKBK", "BARB", "PUNB"]
_CHANNELS = ["UPI", "NEFT", "RTGS", "IMPS", "wire"]


def _generate_account_id() -> str:
    prefix = random.choice(_ACCOUNT_PREFIXES)
    return f"{prefix}{random.randint(10000000, 99999999)}"


def _compute_risk_score(txn: GNNTransactionRequest) -> tuple[float, bool, str | None]:
    """Simulate GNN risk scoring."""
    risk = 0.1

    # High amount transactions are riskier
    if txn.amount > 500000:
        risk += 0.3
    elif txn.amount > 100000:
        risk += 0.15

    # Check if accounts are in known mule rings
    ring_id = None
    for ring in mule_rings:
        if txn.from_account in ring["accounts"] or txn.to_account in ring["accounts"]:
            risk += 0.4
            ring_id = ring["ring_id"]
            break

    # Wire transfers are riskier
    if txn.channel == "wire":
        risk += 0.1

    # Add some randomness
    risk += random.uniform(-0.05, 0.15)
    risk = round(min(1.0, max(0.0, risk)), 4)
    is_mule = risk > 0.65

    return risk, is_mule, ring_id


@router.post("/process_transaction", response_model=GNNTransactionResponse)
async def process_transaction(txn: GNNTransactionRequest):
    """Process a single transaction through GNN risk scoring."""
    risk, is_mule, ring_id = _compute_risk_score(txn)
    now = datetime.now(timezone.utc)
    txn_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"

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
    """Batch process transactions."""
    results = []
    now = datetime.now(timezone.utc)
    flagged = 0

    for txn in txns:
        risk, is_mule, ring_id = _compute_risk_score(txn)
        txn_id = f"TXN-{uuid.uuid4().hex[:10].upper()}"
        if is_mule:
            flagged += 1
        results.append({
            "transaction_id": txn_id,
            "from_account": txn.from_account,
            "to_account": txn.to_account,
            "amount": txn.amount,
            "gnn_risk_score": risk,
            "is_mule_suspect": is_mule,
            "ring_id": ring_id,
        })

    return {
        "total_processed": len(results),
        "flagged": flagged,
        "results": results,
        "scanned_at": now.isoformat(),
    }


@router.get("/graph", response_model=GNNGraphResponse)
async def gnn_graph():
    """Return mock transaction graph with nodes, edges, and detected rings."""
    random.seed(7)
    accounts = [_generate_account_id() for _ in range(20)]

    nodes = []
    for i, acc in enumerate(accounts):
        is_mule = i < 6  # First 6 accounts are in a mule ring
        nodes.append({
            "id": acc,
            "type": "mule_suspect" if is_mule else "normal",
            "total_in": round(random.uniform(10000, 800000 if is_mule else 200000), 2),
            "total_out": round(random.uniform(10000, 750000 if is_mule else 180000), 2),
            "tx_count": random.randint(5, 50 if is_mule else 15),
            "risk_score": round(random.uniform(0.7, 0.98) if is_mule else random.uniform(0.05, 0.35), 3),
        })

    edges = []
    # Ring edges (circular)
    for i in range(5):
        edges.append({
            "source": accounts[i],
            "target": accounts[i + 1],
            "amount": round(random.uniform(50000, 300000), 2),
            "channel": random.choice(_CHANNELS),
            "count": random.randint(3, 15),
            "is_suspicious": True,
        })
    # Close the ring
    edges.append({
        "source": accounts[5],
        "target": accounts[0],
        "amount": round(random.uniform(50000, 300000), 2),
        "channel": "NEFT",
        "count": 7,
        "is_suspicious": True,
    })

    # Normal edges
    for _ in range(15):
        src = random.choice(accounts[6:])
        tgt = random.choice([a for a in accounts[6:] if a != src])
        edges.append({
            "source": src,
            "target": tgt,
            "amount": round(random.uniform(1000, 100000), 2),
            "channel": random.choice(_CHANNELS),
            "count": random.randint(1, 5),
            "is_suspicious": False,
        })

    # Some edges connecting normal to mule
    for _ in range(4):
        edges.append({
            "source": random.choice(accounts[6:]),
            "target": random.choice(accounts[:6]),
            "amount": round(random.uniform(20000, 150000), 2),
            "channel": random.choice(_CHANNELS),
            "count": random.randint(1, 3),
            "is_suspicious": True,
        })

    rings_data = [{
        "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
        "accounts": accounts[:6],
        "total_volume": round(sum(e["amount"] for e in edges[:6]), 2),
        "risk_score": 0.94,
        "detected_at": datetime.now(timezone.utc).isoformat(),
    }]

    random.seed()
    return GNNGraphResponse(nodes=nodes, edges=edges, rings=rings_data)


@router.get("/rings")
async def gnn_rings():
    """Return active mule rings."""
    if not mule_rings:
        # Seed default rings
        _seed_rings()

    return {
        "rings": mule_rings,
        "total_active": len(mule_rings),
        "total_accounts_flagged": sum(len(r["accounts"]) for r in mule_rings),
    }


def _seed_rings():
    """Generate mock mule ring data."""
    mule_rings.clear()
    now = datetime.now(timezone.utc)

    ring1_accounts = [_generate_account_id() for _ in range(5)]
    ring2_accounts = [_generate_account_id() for _ in range(7)]
    ring3_accounts = [_generate_account_id() for _ in range(4)]

    mule_rings.extend([
        {
            "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
            "accounts": ring1_accounts,
            "total_volume": round(random.uniform(2000000, 8000000), 2),
            "currency": "INR",
            "risk_score": 0.94,
            "detected_at": (now - timedelta(hours=random.randint(2, 48))).isoformat(),
            "status": "active",
            "pattern": "circular_layering",
            "description": "Five-node circular transfer pattern with rapid fund layering. "
                           "Funds enter via UPI and exit through NEFT to unrelated beneficiaries.",
        },
        {
            "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
            "accounts": ring2_accounts,
            "total_volume": round(random.uniform(5000000, 15000000), 2),
            "currency": "INR",
            "risk_score": 0.89,
            "detected_at": (now - timedelta(hours=random.randint(12, 120))).isoformat(),
            "status": "active",
            "pattern": "fan_out_fan_in",
            "description": "Seven-node fan-out/fan-in structure. Single collection account "
                           "distributes to five intermediaries, reconsolidates through two exit accounts.",
        },
        {
            "ring_id": f"RING-{uuid.uuid4().hex[:6].upper()}",
            "accounts": ring3_accounts,
            "total_volume": round(random.uniform(800000, 3000000), 2),
            "currency": "INR",
            "risk_score": 0.76,
            "detected_at": (now - timedelta(hours=random.randint(1, 12))).isoformat(),
            "status": "monitoring",
            "pattern": "chain_transfer",
            "description": "Linear chain of four accounts with sequential high-value transfers. "
                           "Possible smurfing pattern detected.",
        },
    ])


@router.post("/seed_demo")
async def seed_demo():
    """Seed mock mule ring data for demo purposes."""
    _seed_rings()

    # Also generate some transactions within the rings
    now = datetime.now(timezone.utc)
    for ring in mule_rings:
        accts = ring["accounts"]
        for i in range(len(accts) - 1):
            transactions.append({
                "transaction_id": f"TXN-{uuid.uuid4().hex[:10].upper()}",
                "from_account": accts[i],
                "to_account": accts[i + 1],
                "amount": round(random.uniform(50000, 500000), 2),
                "currency": "INR",
                "channel": random.choice(_CHANNELS),
                "gnn_risk_score": round(random.uniform(0.7, 0.98), 4),
                "is_mule_suspect": True,
                "ring_id": ring["ring_id"],
                "timestamp": (now - timedelta(minutes=random.randint(5, 300))).isoformat(),
            })

    return {
        "status": "seeded",
        "rings_created": len(mule_rings),
        "transactions_created": len(transactions),
        "rings": mule_rings,
    }
