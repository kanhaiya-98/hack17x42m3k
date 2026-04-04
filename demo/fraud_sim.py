#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════════════╗
║       FinShield — UPI Fraud Ring Simulation Demo Script         ║
║   Simulates APP Fraud, Money Mule, and Smurfing attacks         ║
║   Watch the Transaction Risk Feed light up in real time         ║
╚══════════════════════════════════════════════════════════════════╝

Usage:
    python demo/fraud_sim.py                           # run all 3 scenarios
    python demo/fraud_sim.py --scenario app_fraud      # APP Fraud only
    python demo/fraud_sim.py --scenario mule_ring      # Mule Ring only
    python demo/fraud_sim.py --scenario smurfing       # Smurfing only
    python demo/fraud_sim.py --count 20 --delay 0.3   # 20 txns, 0.3s delay

Requirements:
    pip install rich requests
"""

import argparse
import random
import time
import uuid
from datetime import datetime

import requests

try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    RICH = True
    console = Console()
except ImportError:
    RICH = False
    class _C:
        def print(self, *a, **k): print(*[str(x) for x in a])
        def rule(self, *a, **k): print("─" * 60)
    console = _C()

FASTAPI_URL = "http://localhost:8000"

# ── Account pools ─────────────────────────────────────────────────────────────
BANK_PREFIXES = ["HDFC", "ICIC", "SBIN", "UTIB", "KKBK", "BARB", "PUNB"]
UPI_HANDLES = ["@okicici", "@oksbi", "@axisbank", "@ybl", "@paytm", "@gpay"]


def rand_account() -> str:
    return f"{random.choice(BANK_PREFIXES)}{random.randint(10000000, 99999999)}"


def rand_upi() -> str:
    return f"{random.randint(7000000000, 9999999999)}{random.choice(UPI_HANDLES)}"


# ── Scenario 1: APP Fraud (Authorized Push Payment) ──────────────────────────
def scenario_app_fraud(count: int, delay: float):
    """
    Simulates a social engineering (investment scam) APP Fraud attack.
    Victim is tricked into sending ₹1L–₹5L to a scammer's account.
    GNN should detect: high amount + first-time beneficiary + account age <30 days.
    """
    console.print("\n[bold red]▶ Scenario: APP Fraud (Authorized Push Payment)[/bold red]")
    console.print("[dim]Victim sends large amounts to a first-time 'investment' beneficiary[/dim]\n")

    exit_wallet = rand_account()  # The scammer's account
    results = []

    for i in range(count):
        victim = rand_account()
        amount = round(random.uniform(75_000, 500_000), 2)

        try:
            # 1. Process through GNN
            gnn_res = requests.post(
                f"{FASTAPI_URL}/api/gnn/process_transaction",
                json={
                    "from_account": victim,
                    "to_account": exit_wallet,
                    "amount": amount,
                    "currency": "INR",
                    "channel": "UPI",
                },
                timeout=8,
            )

            # 2. Triage with Gemini
            triage_res = requests.post(
                f"{FASTAPI_URL}/api/triage/analyze",
                json={
                    "transaction_id": f"TXN-APP-{uuid.uuid4().hex[:8].upper()}",
                    "amount": amount,
                    "channel": "UPI",
                    "sender_account_age_days": random.randint(500, 2000),
                    "beneficiary_account_age_days": random.randint(5, 25),
                    "frequency_of_new_beneficiaries": round(random.uniform(0.80, 0.98), 2),
                    "is_new_beneficiary": True,
                    "recent_transfers_to_same_beneficiary": 0,
                    "hub_spoke_score": round(random.uniform(0.60, 0.90), 2),
                    "purpose": random.choice(["Investment", "Emergency", "Business opportunity"]),
                },
                timeout=15,
            )

            gnn_data = gnn_res.json() if gnn_res.ok else {}
            triage_data = triage_res.json() if triage_res.ok else {}

            result = {
                "txn": f"TXN-APP-{i+1:02d}",
                "amount": f"₹{amount:,.0f}",
                "gnn_risk": gnn_data.get("gnn_risk_score", "?"),
                "classification": triage_data.get("fraud_classification", "?"),
                "action": triage_data.get("transaction_action", "?"),
            }
            results.append(result)

            status_color = "red" if triage_data.get("transaction_action") in ("freeze_transfer", "step_up_mfa") else "yellow"
            console.print(
                f"  [{status_color}]#{i+1:02d}[/{status_color}]  {result['amount']:<15}  "
                f"Risk={result['gnn_risk']}  [{status_color}]{result['classification']:<25}[/{status_color}]  → {result['action']}"
            )

        except requests.exceptions.ConnectionError:
            console.print(f"  [red]#{i+1:02d}  ✗ FastAPI not reachable at {FASTAPI_URL}[/red]")
            break
        except Exception as e:
            console.print(f"  [yellow]#{i+1:02d}  Error: {e}[/yellow]")

        time.sleep(delay)

    blocked = sum(1 for r in results if r["action"] in ("freeze_transfer", "step_up_mfa", "honeypot_escrow"))
    console.print(f"\n  [bold]APP Fraud: {len(results)} transactions | {blocked} intercepted | exit wallet: {exit_wallet[:12]}…[/bold]")
    return results


# ── Scenario 2: Money Mule Hub-and-Spoke ─────────────────────────────────────
def scenario_mule_ring(count: int, delay: float):
    """
    Simulates a hub-and-spoke money mule ring.
    50 victims send ₹30k–₹85k to the same exit wallet within minutes.
    GNN detects: high in-degree on exit wallet, account age <30 days.
    """
    console.print("\n[bold purple]▶ Scenario: Money Mule Hub-and-Spoke Ring[/bold purple]")
    console.print(f"[dim]{count} GPay accounts sending to 1 exit wallet (simulating 2-hour window)[/dim]\n")

    exit_wallet = f"SBIN{random.randint(10000000, 99999999)}"  # The mule exit wallet
    relay_accounts = [rand_account() for _ in range(min(5, count // 4))]
    results = []

    # Seed a ring via the GNN seed endpoint first
    try:
        requests.post(f"{FASTAPI_URL}/api/gnn/seed_demo", timeout=5)
    except Exception:
        pass

    for i in range(count):
        # Mix of: direct victim → exit, and victim → relay → exit
        use_relay = random.random() < 0.35 and relay_accounts
        from_acc = rand_account()
        to_acc = random.choice(relay_accounts) if use_relay else exit_wallet
        amount = round(random.uniform(30_000, 85_000), 2)

        try:
            res = requests.post(
                f"{FASTAPI_URL}/api/gnn/process_transaction",
                json={
                    "from_account": from_acc,
                    "to_account": to_acc,
                    "amount": amount,
                    "currency": "INR",
                    "channel": random.choice(["UPI", "NEFT", "IMPS"]),
                },
                timeout=8,
            )
            data = res.json() if res.ok else {}

            risk = data.get("gnn_risk_score", 0)
            is_mule = data.get("is_mule_suspect", False)
            status = "[red]MULE SUSPECT[/red]" if is_mule else "[green]CLEAN[/green]"
            console.print(
                f"  {'relay' if use_relay else 'direct':>6}  ₹{amount:>10,.0f}  "
                f"→ {to_acc[:12]}…  Risk={risk:.3f}  {status}"
            )
            results.append({"risk": risk, "is_mule": is_mule, "amount": amount})
        except requests.exceptions.ConnectionError:
            console.print(f"  [red]✗ FastAPI not reachable[/red]")
            break
        except Exception as e:
            console.print(f"  [yellow]Error: {e}[/yellow]")

        time.sleep(delay)

    mule_count = sum(1 for r in results if r["is_mule"])
    total_vol = sum(r["amount"] for r in results)
    console.print(
        f"\n  [bold]Mule Ring: {len(results)} txns | {mule_count} flagged as mule | "
        f"Total volume ₹{total_vol:,.0f} | Exit: {exit_wallet}[/bold]"
    )

    # Try to freeze the exit wallet
    try:
        freeze_res = requests.post(
            f"{FASTAPI_URL}/api/gnn/freeze_account",
            params={"account_id": exit_wallet, "reason": "Hub-and-spoke ring detected by GNN"},
            timeout=5,
        )
        if freeze_res.ok:
            console.print(f"  [bold red]🔒 Exit wallet {exit_wallet} FROZEN — pattern broadcast to federation[/bold red]")
    except Exception:
        pass

    return results


# ── Scenario 3: Transaction Smurfing ─────────────────────────────────────────
def scenario_smurfing(count: int, delay: float):
    """
    Simulates transaction smurfing: many small payments just below ₹10,000
    (the RBI automatic reporting threshold) to the same exit wallet.
    GNN detects: clustering of amounts in ₹7k-₹9.9k band, same destination.
    """
    console.print("\n[bold yellow]▶ Scenario: Transaction Smurfing[/bold yellow]")
    console.print("[dim]Many sub-₹10k UPI payments to same exit wallet — avoiding RBI reporting threshold[/dim]\n")

    exit_wallet = rand_account()
    results = []

    for i in range(count):
        from_acc = rand_account()
        # Deliberately cluster amounts: ₹7,200–₹9,800 (below ₹10k threshold)
        amount = round(random.uniform(7_200, 9_800), 2)

        try:
            res = requests.post(
                f"{FASTAPI_URL}/api/gnn/process_transaction",
                json={
                    "from_account": from_acc,
                    "to_account": exit_wallet,
                    "amount": amount,
                    "currency": "INR",
                    "channel": "UPI",
                },
                timeout=8,
            )
            data = res.json() if res.ok else {}
            risk = data.get("gnn_risk_score", 0)
            console.print(
                f"  #{i+1:02d}  ₹{amount:>8,.0f}  → {exit_wallet[:12]}…  "
                f"Risk={risk:.3f}  {'[yellow]SMURFING[/yellow]' if risk > 0.5 else '[green]OK[/green]'}"
            )
            results.append({"amount": amount, "risk": risk})
        except requests.exceptions.ConnectionError:
            console.print(f"  [red]✗ FastAPI not reachable[/red]")
            break
        except Exception as e:
            console.print(f"  [yellow]Error: {e}[/yellow]")

        time.sleep(delay)

    total_vol = sum(r["amount"] for r in results)
    flagged = sum(1 for r in results if r["risk"] > 0.5)
    console.print(
        f"\n  [bold]Smurfing: {len(results)} txns | {flagged} flagged | "
        f"Total ₹{total_vol:,.0f} (would be ₹{total_vol:,.0f} in 1 transfer — above ₹10k threshold)[/bold]"
    )
    return results


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="FinShield UPI Fraud Ring Simulation")
    parser.add_argument("--scenario", choices=["app_fraud", "mule_ring", "smurfing", "all"], default="all")
    parser.add_argument("--count", type=int, default=8, help="Transactions per scenario")
    parser.add_argument("--delay", type=float, default=0.4, help="Seconds between transactions")
    args = parser.parse_args()

    console.print()
    if RICH:
        from rich.panel import Panel
        console.print(Panel.fit(
            "[bold]FinShield AI — UPI Fraud Simulation[/bold]\n"
            f"[dim]Target:[/dim] [cyan]{FASTAPI_URL}[/cyan]\n"
            f"[dim]Scenario:[/dim] [white]{args.scenario}[/white]  "
            f"[dim]Count:[/dim] [white]{args.count}[/white]  "
            f"[dim]Delay:[/dim] [white]{args.delay}s[/white]",
            border_style="purple",
        ))

    console.print("[dim]Open http://localhost:3000/dashboard to watch the Transaction Risk Feed update live[/dim]")
    console.print("[dim]─────────────────────────────────────────────────────────────────[/dim]")

    # Check API health
    try:
        r = requests.get(f"{FASTAPI_URL}/health", timeout=3)
        if r.ok:
            console.print(f"[green]✓ FastAPI healthy[/green]  {FASTAPI_URL}")
        else:
            console.print(f"[red]✗ FastAPI returned {r.status_code}[/red]")
            return
    except Exception:
        console.print(f"[red]✗ Cannot reach FastAPI at {FASTAPI_URL}[/red]")
        console.print("[dim]  Start it: cd ai_services && uvicorn main:app --port 8000 --reload[/dim]")
        return

    if args.scenario in ("app_fraud", "all"):
        scenario_app_fraud(args.count, args.delay)

    if args.scenario in ("mule_ring", "all"):
        scenario_mule_ring(args.count * 2, args.delay)  # More transactions for hub-and-spoke

    if args.scenario in ("smurfing", "all"):
        scenario_smurfing(args.count, args.delay)

    console.print("\n[bold green]✓ Simulation complete — check the FinShield dashboard[/bold green]")
    console.print(f"  [dim]API transactions feed: {FASTAPI_URL}/api/gnn/transactions[/dim]")
    console.print(f"  [dim]Triage history:         {FASTAPI_URL}/api/triage/history[/dim]")
    console.print(f"  [dim]Active mule rings:      {FASTAPI_URL}/api/gnn/rings[/dim]\n")


if __name__ == "__main__":
    main()
