#!/usr/bin/env python3
"""
PaySim → FinShield Transaction Mapper
======================================
Maps columns from the publicly available PaySim synthetic mobile money
dataset (Kaggle: "Synthetic Financial Datasets For Fraud Detection") to
FinShield's Supabase transactions table.

Dataset URL:
    https://www.kaggle.com/datasets/ealaxi/paysim1
    File: PS_20174392719_1491204439457_log.csv  (~500MB, 6.3M rows)

PaySim columns:
    step, type, amount, nameOrig, oldbalanceOrg, newbalanceOrig,
    nameDest, oldbalanceDest, newbalanceDest, isFraud, isFlaggedFraud

FinShield GNN node features extracted:
    - avg_transaction_value          (mean amount per nameOrig)
    - frequency_of_new_beneficiaries (fraction of transfers to nameDest seen <3 times)
    - time_since_account_creation    (approximated from step index)
    - hub_spoke_score                (in-degree of nameDest / max in-degree)

Usage:
    pip install pandas requests rich
    python ai_services/scripts/paysim_mapper.py --file path/to/paysim.csv --limit 5000
    python ai_services/scripts/paysim_mapper.py --file path/to/paysim.csv --seed     # seeds FastAPI directly
    python ai_services/scripts/paysim_mapper.py --generate 200                        # generate synthetic data (no file needed)
"""

import argparse
import json
import random
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path

import requests

FASTAPI_URL = "http://localhost:8000"

# ── PaySim type → FinShield channel mapping ──────────────────────────────────
PAYSIM_TYPE_TO_CHANNEL = {
    "PAYMENT":  "UPI",
    "TRANSFER": "NEFT",
    "CASH_OUT": "IMPS",
    "CASH_IN":  "RTGS",
    "DEBIT":    "UPI",
}

# ── PaySim isFraud=1 maps to which FinShield attack type ─────────────────────
def classify_attack(row: dict) -> str:
    """
    Map PaySim fraud row to FinShield attack taxonomy.

    PaySim fraud patterns:
      TRANSFER + isFraud=1    → Money Mule (hub-and-spoke layering)
      CASH_OUT + isFraud=1    → APP Fraud (authorized push payment exit)
      Any + isFlaggedFraud=1  → Transaction Smurfing (flagged by old rules)
      No fraud                → Benign
    """
    txn_type = row.get("type", "")
    is_fraud = int(row.get("isFraud", 0))
    is_flagged = int(row.get("isFlaggedFraud", 0))

    if not is_fraud and not is_flagged:
        return "Benign"
    if is_flagged:
        return "Transaction Smurfing"
    if txn_type == "TRANSFER":
        return "Money Mule"
    if txn_type == "CASH_OUT":
        return "APP Fraud"
    return "Money Mule"


def compute_node_features(rows: list[dict]) -> dict[str, dict]:
    """
    Compute per-account GNN node features from a batch of PaySim rows.

    Returns dict[account_id] → {
        avg_transaction_value,
        frequency_of_new_beneficiaries,
        time_since_account_creation_days,
        hub_spoke_score,
    }
    """
    from collections import defaultdict

    # Count in-degree of each destination account (for hub-spoke score)
    dest_count: dict[str, int] = defaultdict(int)
    for row in rows:
        dest_count[row.get("nameDest", "")] += 1

    max_indegree = max(dest_count.values(), default=1)

    # Per-originator stats
    orig_amounts: dict[str, list[float]] = defaultdict(list)
    orig_dests: dict[str, set[str]] = defaultdict(set)
    orig_all_dests: dict[str, list[str]] = defaultdict(list)
    orig_min_step: dict[str, int] = defaultdict(lambda: 999999)

    for row in rows:
        orig = row.get("nameOrig", "")
        dest = row.get("nameDest", "")
        amount = float(row.get("amount", 0))
        step = int(row.get("step", 0))

        orig_amounts[orig].append(amount)
        orig_all_dests[orig].append(dest)
        orig_min_step[orig] = min(orig_min_step[orig], step)

        # Track "new" beneficiaries (first time seen for this originator)
        if dest not in orig_dests[orig]:
            orig_dests[orig].add(dest)

    features: dict[str, dict] = {}
    for orig, amounts in orig_amounts.items():
        all_dests = orig_all_dests[orig]
        unique_dests = len(set(all_dests))
        new_bene_freq = unique_dests / len(all_dests) if all_dests else 0

        # Account creation approximation: step 1 = day 1 of simulation
        # PaySim step ≈ 1 hour. 24 steps = 1 day.
        account_age_hours = orig_min_step[orig]
        account_age_days = max(1, account_age_hours // 24)

        features[orig] = {
            "avg_transaction_value": round(sum(amounts) / len(amounts), 2),
            "frequency_of_new_beneficiaries": round(new_bene_freq, 4),
            "time_since_account_creation_days": account_age_days,
            "hub_spoke_score": round(dest_count.get(orig, 0) / max_indegree, 4),
        }

    return features


def paysim_row_to_finshield(row: dict, features: dict[str, dict], base_time: datetime) -> dict:
    """Convert one PaySim CSV row to a FinShield GNN transaction dict."""
    orig = row.get("nameOrig", f"ACC{uuid.uuid4().hex[:8].upper()}")
    dest = row.get("nameDest", f"ACC{uuid.uuid4().hex[:8].upper()}")
    amount_inr = float(row.get("amount", 0)) * 0.012  # USD → INR approx (not exact, demo only)
    step = int(row.get("step", 0))
    channel = PAYSIM_TYPE_TO_CHANNEL.get(row.get("type", "PAYMENT"), "UPI")
    attack_type = classify_attack(row)
    feat = features.get(orig, {})

    # Risk score heuristic matching GNN node features
    risk = 0.1
    if feat.get("avg_transaction_value", 0) > 50000:
        risk += 0.25
    if feat.get("frequency_of_new_beneficiaries", 0) > 0.8:
        risk += 0.25
    if feat.get("time_since_account_creation_days", 365) < 30:
        risk += 0.20
    if feat.get("hub_spoke_score", 0) > 0.7:
        risk += 0.30
    if int(row.get("isFraud", 0)):
        risk = min(0.99, risk + 0.25)
    risk = round(min(0.99, max(0.05, risk + random.uniform(-0.03, 0.05))), 4)

    # Action
    if risk > 0.85:
        action = "freeze_transfer"
    elif risk > 0.65:
        action = "step_up_mfa"
    elif risk > 0.45:
        action = "honeypot_escrow"
    else:
        action = "approve"

    txn_time = base_time + timedelta(hours=step)

    return {
        "transaction_id": f"TXN-PS-{uuid.uuid4().hex[:10].upper()}",
        "from_account": orig[:20],
        "to_account": dest[:20],
        "amount": round(amount_inr, 2),
        "currency": "INR",
        "channel": channel,
        "gnn_risk_score": risk,
        "is_mule_suspect": risk > 0.60,
        "attack_type": attack_type,
        "action": action,
        "paysim_type": row.get("type", ""),
        "paysim_is_fraud": bool(int(row.get("isFraud", 0))),
        "node_features": feat,
        "timestamp": txn_time.isoformat(),
    }


def load_paysim(filepath: str, limit: int = 1000) -> list[dict]:
    """Load PaySim CSV and return list of row dicts."""
    try:
        import pandas as pd  # noqa: F401
    except ImportError:
        raise ImportError("Run: pip install pandas")

    import pandas as pd
    path = Path(filepath)
    if not path.exists():
        raise FileNotFoundError(f"PaySim file not found: {filepath}")

    print(f"Loading PaySim dataset: {path.name} (limit={limit})")
    df = pd.read_csv(filepath, nrows=limit)
    print(f"  Loaded {len(df):,} rows | Fraud: {df['isFraud'].sum()} | Flagged: {df['isFlaggedFraud'].sum()}")
    return df.to_dict("records")


def generate_synthetic_paysim(n: int = 200) -> list[dict]:
    """
    Generate synthetic PaySim-style data without needing the real file.
    Useful for demos when the 500MB dataset is not available.
    """
    types = ["PAYMENT", "TRANSFER", "CASH_OUT", "CASH_IN", "DEBIT"]
    weights = [0.35, 0.25, 0.22, 0.10, 0.08]

    # Generate accounts — some are mule exit wallets (high in-degree)
    legit_accounts = [f"C{random.randint(10000000, 99999999)}" for _ in range(80)]
    mule_exit = [f"M{random.randint(10000000, 99999999)}" for _ in range(5)]  # Small number of exit wallets

    rows = []
    for step in range(n):
        txn_type = random.choices(types, weights=weights)[0]
        is_exit_dest = random.random() < 0.15  # 15% go to mule exit wallets
        dest = random.choice(mule_exit) if is_exit_dest else random.choice(legit_accounts)
        orig = random.choice(legit_accounts)
        if orig == dest:
            dest = random.choice(legit_accounts)

        # Fraud pattern: TRANSFER to mule exit = fraud
        is_fraud = 1 if (txn_type in ("TRANSFER", "CASH_OUT") and is_exit_dest) else 0
        amount = (
            random.uniform(50000, 500000) if is_fraud
            else random.uniform(500, 25000)
        )
        rows.append({
            "step": step,
            "type": txn_type,
            "amount": amount,
            "nameOrig": orig,
            "oldbalanceOrg": random.uniform(amount, amount * 3),
            "newbalanceOrig": random.uniform(0, amount),
            "nameDest": dest,
            "oldbalanceDest": random.uniform(0, 100000),
            "newbalanceDest": random.uniform(0, 200000) if is_fraud else random.uniform(0, 50000),
            "isFraud": is_fraud,
            "isFlaggedFraud": 1 if amount > 200_000 and is_fraud else 0,
        })

    return rows


def seed_to_fastapi(transactions: list[dict]):
    """POST each transaction to FastAPI GNN endpoint."""
    print(f"\nSeeding {len(transactions)} transactions to FastAPI...")
    success = 0
    errors_count = 0

    for txn in transactions:
        try:
            res = requests.post(
                f"{FASTAPI_URL}/api/gnn/process_transaction",
                json={
                    "from_account": txn["from_account"],
                    "to_account": txn["to_account"],
                    "amount": txn["amount"],
                    "currency": txn["currency"],
                    "channel": txn["channel"],
                },
                timeout=5,
            )
            if res.ok:
                success += 1
        except Exception:
            errors_count += 1

    print(f"  ✓ Seeded: {success} | Errors: {errors_count}")
    print(f"  View results: {FASTAPI_URL}/api/gnn/transactions")


def main():
    parser = argparse.ArgumentParser(
        description="PaySim → FinShield Transaction Mapper",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python paysim_mapper.py --generate 500
  python paysim_mapper.py --file PS_20174392719.csv --limit 2000
  python paysim_mapper.py --generate 300 --seed
  python paysim_mapper.py --file paysim.csv --limit 5000 --seed --output mapped.json
        """,
    )
    parser.add_argument("--file", help="Path to PaySim CSV file (download from Kaggle)")
    parser.add_argument("--generate", type=int, default=0, help="Generate N synthetic PaySim-style rows (no file needed)")
    parser.add_argument("--limit", type=int, default=1000, help="Max rows to process from real PaySim file")
    parser.add_argument("--seed", action="store_true", help="POST transactions to FastAPI after mapping")
    parser.add_argument("--output", help="Save mapped JSON to file")
    args = parser.parse_args()

    if not args.file and not args.generate:
        print("Usage: python paysim_mapper.py --generate 200")
        print("       python paysim_mapper.py --file paysim.csv --limit 1000")
        return

    # Load or generate data
    if args.file:
        raw_rows = load_paysim(args.file, limit=args.limit)
    else:
        print(f"Generating {args.generate} synthetic PaySim-style transactions...")
        raw_rows = generate_synthetic_paysim(args.generate)

    # Compute GNN node features
    print("Computing GNN node features (avg_transaction_value, frequency_of_new_beneficiaries, account_age)...")
    features = compute_node_features(raw_rows)
    print(f"  Computed features for {len(features)} unique accounts")

    # Map to FinShield format
    base_time = datetime.now(timezone.utc) - timedelta(hours=len(raw_rows))
    transactions = [paysim_row_to_finshield(row, features, base_time) for row in raw_rows]

    # Stats
    fraud_count = sum(1 for t in transactions if t["paysim_is_fraud"])
    by_type = {}
    for t in transactions:
        by_type[t["attack_type"]] = by_type.get(t["attack_type"], 0) + 1

    print(f"\n{'─'*50}")
    print(f"  Total transactions mapped : {len(transactions):,}")
    print(f"  PaySim fraud rows         : {fraud_count:,}")
    print(f"  Attack type breakdown:")
    for attack, count in sorted(by_type.items(), key=lambda x: -x[1]):
        print(f"    {attack:<30} {count:>6}")
    print(f"{'─'*50}\n")

    # Output JSON
    if args.output:
        Path(args.output).write_text(json.dumps(transactions, indent=2))
        print(f"Saved {len(transactions)} transactions → {args.output}")

    # Seed to API
    if args.seed:
        seed_to_fastapi(transactions)

    if not args.output and not args.seed:
        print("Tip: add --seed to POST to FastAPI, or --output file.json to save")
        print(f"Sample transaction:\n{json.dumps(transactions[0], indent=2)}")


if __name__ == "__main__":
    main()
