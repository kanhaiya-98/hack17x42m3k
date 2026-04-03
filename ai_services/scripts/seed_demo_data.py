#!/usr/bin/env python3
"""
Seed Supabase with demo data for FinShield AI dashboard.
Creates: sessions, threat_events, transactions, mule_rings, red_team_runs.
Can run standalone (prints JSON) or with Supabase if SUPABASE_URL is set.
"""

import json
import random
import uuid
from datetime import datetime, timedelta, timezone

random.seed(42)


def gen_uuid():
    return str(uuid.uuid4())


def gen_sessions(n=20):
    banks = ["bank-a", "bank-b", "bank-c"]
    cities = [
        ("Mumbai", "IN", 19.076, 72.8777),
        ("Delhi", "IN", 28.7041, 77.1025),
        ("Bangalore", "IN", 12.9716, 77.5946),
        ("Chennai", "IN", 13.0827, 80.2707),
        ("Hyderabad", "IN", 17.385, 78.4867),
        ("Moscow", "RU", 55.7558, 37.6173),
        ("Beijing", "CN", 39.9042, 116.4074),
        ("Lagos", "NG", 6.5244, 3.3792),
    ]
    sessions = []
    for i in range(n):
        city = random.choice(cities)
        is_bot = random.random() < 0.35
        conf = round(random.uniform(0.75, 0.98), 2) if is_bot else round(random.uniform(0.02, 0.35), 2)
        actions = ["redirect_to_honeypot", "terminate", "step_up_mfa"] if is_bot else ["allow"]
        sessions.append({
            "id": gen_uuid(),
            "user_id": f"user_{random.randint(1000, 9999)}",
            "bank_id": random.choice(banks),
            "ip_address": f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}",
            "geo_country": city[1],
            "geo_city": city[0],
            "lat": city[2],
            "lng": city[3],
            "device_fingerprint": f"fp_{random.randint(100000, 999999)}",
            "user_agent": random.choice([
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0",
                "Mozilla/5.0 (Linux; Android 13) Mobile Safari/537.36",
                "python-requests/2.31.0",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) Safari/17.0",
            ]),
            "is_bot": is_bot,
            "bot_confidence": conf,
            "is_honeypotted": is_bot and random.random() < 0.4,
            "mitigation_action": random.choice(actions),
        })
    return sessions


def gen_threat_events(sessions, n=15):
    classifications = [
        "Credential Stuffing", "API Abuse", "Synthetic Identity",
        "Low-and-Slow DDoS", "Mule Network",
    ]
    events = []
    bot_sessions = [s for s in sessions if s["is_bot"]]
    for i in range(min(n, len(bot_sessions))):
        s = bot_sessions[i]
        classification = random.choice(classifications)
        events.append({
            "id": gen_uuid(),
            "session_id": s["id"],
            "bank_id": s["bank_id"],
            "incident_id": gen_uuid(),
            "threat_classification": classification,
            "confidence_score": random.randint(60, 98),
            "risk_severity": random.randint(5, 10),
            "mitigation_action": s["mitigation_action"],
            "reasoning_summary": f"Session from {s['geo_city']} ({s['geo_country']}) flagged with bot_confidence={s['bot_confidence']}. "
                                 f"Behavioral analysis indicates {classification.lower()} pattern with automated request timing.",
            "iocs": json.dumps([
                {"type": "ip", "value": s["ip_address"]},
                {"type": "fingerprint", "value": s["device_fingerprint"]},
                {"type": "user_agent", "value": s["user_agent"]},
            ]),
            "honeypot_payloads": json.dumps([]) if not s["is_honeypotted"] else json.dumps([
                {"endpoint": "/api/accounts/balance", "method": "GET", "password_attempted": f"pass{random.randint(100, 999)}"},
            ]),
            "is_federated_shared": random.random() < 0.3,
        })
    return events


def gen_transactions(n=50):
    accounts = [f"acc_{random.randint(10000, 99999)}" for _ in range(30)]
    exit_wallets = [f"exit_{random.randint(10000, 99999)}" for _ in range(3)]
    txns = []
    for i in range(n):
        is_mule = random.random() < 0.3
        from_acc = random.choice(accounts)
        to_acc = random.choice(exit_wallets) if is_mule else random.choice(accounts)
        txns.append({
            "id": gen_uuid(),
            "from_account": from_acc,
            "to_account": to_acc,
            "amount": round(random.uniform(500, 250000), 2),
            "currency": "INR",
            "bank_id": random.choice(["bank-a", "bank-b", "bank-c"]),
            "gnn_risk_score": round(random.uniform(0.6, 0.95), 2) if is_mule else round(random.uniform(0.01, 0.3), 2),
            "is_flagged": is_mule,
        })
    return txns


def gen_mule_rings(transactions):
    flagged = [t for t in transactions if t["is_flagged"]]
    if not flagged:
        return []
    exit_wallets = list(set(t["to_account"] for t in flagged if t["to_account"].startswith("exit_")))
    accounts = list(set(t["from_account"] for t in flagged))
    total = sum(t["amount"] for t in flagged)
    return [{
        "id": gen_uuid(),
        "accounts": accounts[:15],
        "exit_wallets": exit_wallets,
        "total_amount": round(total, 2),
        "confidence": round(random.uniform(0.85, 0.97), 2),
        "status": "active",
    }]


def gen_red_team_runs(n=20):
    attack_types = ["proxy_rotation", "behavior_mimic", "timing_attack", "api_abuse",
                     "credential_stuffing_slow", "fingerprint_spoof", "session_replay", "sql_injection_probe"]
    runs = []
    cumulative = 0.0
    for i in range(n):
        attack = random.choice(attack_types)
        success = random.random() < 0.15
        cumulative += 1.0 if success else -0.1
        runs.append({
            "id": gen_uuid(),
            "run_type": attack,
            "success": success,
            "bypass_method": f"Exploited {attack} weakness" if success else None,
            "patch_recommendation": f"Strengthen {attack} detection layer" if success else None,
            "reward_score": round(cumulative, 2),
        })
    return runs


if __name__ == "__main__":
    sessions = gen_sessions()
    threats = gen_threat_events(sessions)
    transactions = gen_transactions()
    rings = gen_mule_rings(transactions)
    runs = gen_red_team_runs()

    data = {
        "sessions": sessions,
        "threat_events": threats,
        "transactions": transactions,
        "mule_rings": rings,
        "red_team_runs": runs,
    }

    print(json.dumps(data, indent=2, default=str))
    print(f"\nGenerated: {len(sessions)} sessions, {len(threats)} threats, "
          f"{len(transactions)} transactions, {len(rings)} rings, {len(runs)} red team runs")
