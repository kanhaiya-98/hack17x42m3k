#!/usr/bin/env python3
"""
╔══════════════════════════════════════════════════════════╗
║         ZeroBank Attack Simulation — FinShield Demo      ║
║   Fires real bot sessions with robotic biometric data    ║
║   Watch the FinShield dashboard light up in real time    ║
╚══════════════════════════════════════════════════════════╝

Usage:
    python demo/attack_sim.py
    python demo/attack_sim.py --threads 10 --mode burst
    python demo/attack_sim.py --threads 3 --mode slow --honeypot
    python demo/attack_sim.py --delay 1.0

Requirements:
    pip install rich requests
"""

import argparse
import random
import threading
import time
import uuid
from datetime import datetime

import requests

# ── Try rich for terminal UI, fall back to plain output ──────────────────────
try:
    from rich.console import Console
    from rich.panel import Panel
    from rich.table import Table
    from rich.text import Text
    from rich.live import Live
    from rich.columns import Columns
    from rich.layout import Layout
    from rich.progress import SpinnerColumn, TextColumn, Progress
    RICH = True
    console = Console()
except ImportError:
    RICH = False
    class _Console:
        def print(self, *args, **kwargs):
            print(*[str(a) for a in args])
        def rule(self, *args, **kwargs): print("─" * 60)
    console = _Console()

# ── Configuration ─────────────────────────────────────────────────────────────
FASTAPI_URL = "http://localhost:8000"
ZEROBANK_URL = "http://localhost:3000"

# 200 fake email addresses
EMAILS = [
    f"user{random.randint(100,999)}@gmail.com" for _ in range(40)
] + [
    f"{n}.{s}@yahoo.com"
    for n in ["rahul", "priya", "amit", "neha", "vikram", "deepa", "arjun", "kavya", "rohit", "pooja"]
    for s in ["sharma91", "gupta88", "singh73", "kumar99", "mehta21"]
] + [
    f"test{i}@mailinator.com" for i in range(1, 51)
] + [
    f"bot{uuid.uuid4().hex[:6]}@tempmail.org" for _ in range(60)
]

# 200 common passwords
PASSWORDS = [
    "password", "123456", "password123", "admin", "letmein", "qwerty",
    "monkey", "1234567890", "abc123", "iloveyou", "111111", "welcome",
    "login", "master", "sunshine", "princess", "dragon", "football",
    "shadow", "superman", "michael", "batman", "pass123", "india@123",
    "Passw0rd", "P@ssword1", "Admin@123", "Test@1234", "Welcome1",
] + [f"Pass{i:04d}" for i in range(170)]

# 20 real user-agent strings
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.119 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0",
    "python-requests/2.31.0",
    "python-requests/2.28.2",
    "Go-http-client/2.0",
    "Scrapy/2.11.0 (+https://scrapy.org)",
    "curl/7.88.1",
    "axios/1.6.7",
    "node-fetch/3.3.2",
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
    "Mozilla/5.0 (Windows NT 6.1) AppleWebKit/537.36 Chrome/41.0.2228.0 Safari/537.36",
    "Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Safari/604.1",
    "Dalvik/2.1.0 (Linux; U; Android 9; SM-G960F Build/PPR1.180610.011)",
    "okhttp/4.11.0",
    "Jakarta Commons-HttpClient/3.1",
]

# IP ranges — mixed geo (makes the globe visualizer light up)
def random_ip() -> str:
    # Mix of suspicious ranges
    ranges = [
        (185, 73, 99),   # Latvia (known abuse)
        (91, 210, 44),   # Russia
        (103, 42, 18),   # Vietnam
        (45, 33, 22),    # US datacentre
        (194, 67, 90),   # Germany datacentre
        (47, 90, 22),    # China
        (5, 188, 211),   # Eastern Europe proxy
        (192, 168, 1),   # Residential spoofed
        (103, 88, 12),   # India proxy
        (77, 105, 3),    # Netherlands VPN
    ]
    r = random.choice(ranges)
    return f"{r[0]}.{r[1]}.{r[2]}.{random.randint(1, 254)}"

# ── Robotic biometric events (zero variance = instant bot detection) ───────────
def make_robotic_events(session_id: str) -> list[dict]:
    """
    Events that look perfectly mechanical:
    - dwell_ms: exactly 120.0 every time (no human has this)
    - flight_ms: exactly 85.0 (robots don't hesitate)
    - mouse: all zeros (bots don't move the mouse)
    - timestamps: perfectly spaced (robotic cadence)
    """
    now_ms = int(time.time() * 1000)
    events = []
    for i in range(20):
        events.append({
            "session_id": session_id,
            "event_type": "keydown",
            "timestamp_ms": now_ms + (i * 120),  # Perfectly spaced
            "dwell_ms": 120.0,                    # Exactly the same every time → triggers keystroke_dwell_too_uniform
            "flight_ms": 85.0,                    # Exactly the same every time → triggers keystroke_flight_too_uniform
            "key_code": "KeyA",
            "mouse_x": 0.0,                       # No mouse movement
            "mouse_y": 0.0,
            "mouse_speed": 0.0,                   # Zero speed → triggers mouse_speed_constant
            "scroll_delta": 0.0,
            "gyro_alpha": 0.0,
            "gyro_beta": 0.0,
            "gyro_gamma": 0.0,
        })
    return events

# ── Global state (shared across threads) ──────────────────────────────────────
_lock = threading.Lock()
_stats = {
    "total_attempts": 0,
    "sessions_created": 0,
    "detections": 0,
    "honeypot_traps": 0,
    "errors": 0,
    "running": True,
    "log": [],  # List of (ts, email, ip, status_str)
}

def _log(email: str, ip: str, status: str, color: str = "white"):
    ts = datetime.now().strftime("%H:%M:%S.%f")[:-3]
    with _lock:
        _stats["log"].insert(0, (ts, email, ip, status, color))
        if len(_stats["log"]) > 60:
            _stats["log"] = _stats["log"][:60]


# ── Single attack thread ───────────────────────────────────────────────────────
def attack_thread(args, thread_id: int):
    while _stats["running"]:
        email = random.choice(EMAILS)
        ip = random_ip()
        ua = random.choice(USER_AGENTS)
        fingerprint = str(uuid.uuid4())
        session_id = None

        # Step 1 — Create session
        try:
            resp = requests.post(
                f"{FASTAPI_URL}/api/session/start",
                json={
                    "ip": ip,
                    "user_agent": ua,
                    "fingerprint_id": fingerprint,
                    "bank_id": "BANK-A",
                },
                timeout=5,
            )
            if resp.status_code == 200:
                session_id = resp.json().get("session_id")
                with _lock:
                    _stats["sessions_created"] += 1
                    _stats["total_attempts"] += 1
                _log(email, ip, "ATTEMPT SENT", "yellow")
            else:
                with _lock:
                    _stats["errors"] += 1
                _log(email, ip, f"ERR {resp.status_code}", "red")
        except Exception as e:
            with _lock:
                _stats["errors"] += 1
            _log(email, ip, "CONN ERROR", "red")
            time.sleep(args.delay)
            continue

        # Step 2 — Fire robotic biometric events
        if session_id:
            time.sleep(0.2)
            try:
                events = make_robotic_events(session_id)
                bio_resp = requests.post(
                    f"{FASTAPI_URL}/api/biometric/infer",
                    json=events,
                    params={"session_id": session_id},
                    timeout=5,
                )
                if bio_resp.status_code == 200:
                    result = bio_resp.json()
                    confidence = result.get("bot_confidence", 0)
                    if confidence > 0.72:
                        with _lock:
                            _stats["detections"] += 1
                        _log(email, ip, f"DETECTED — conf={confidence:.2f}", "red")

                        # Honeypot mode — try honeypot APIs
                        if args.honeypot:
                            _probe_honeypot(session_id, email, ip)
                    else:
                        _log(email, ip, f"IN PROGRESS — conf={confidence:.2f}", "cyan")
            except Exception:
                pass

        time.sleep(args.delay)


def _probe_honeypot(session_id: str, email: str, ip: str):
    """In honeypot mode — make requests to honeypot APIs and log what attacker sees."""
    try:
        resp = requests.get(
            f"{FASTAPI_URL}/api/honeypot/session/{session_id}",
            timeout=3,
        )
        if resp.ok:
            data = resp.json()
            _log(email, ip, f"[HONEYPOT] Got fake balance: ₹{data.get('balance', '?')}", "magenta")
    except Exception:
        pass


# ── Poll Supabase for real detections count ───────────────────────────────────
def stats_poller(args):
    while _stats["running"]:
        time.sleep(5)
        try:
            resp = requests.get(f"{FASTAPI_URL}/api/demo/status", timeout=3)
            if resp.ok:
                data = resp.json()
                with _lock:
                    _stats["detections"] = data.get("flagged_sessions", _stats["detections"])
        except Exception:
            pass


# ── Rich terminal UI ──────────────────────────────────────────────────────────
def render_ui(args):
    mode_color = "red" if args.mode == "burst" else "yellow"
    mode_label = "BURST MODE — maximum throughput" if args.mode == "burst" else "SLOW DRIP — evading rate limiters"

    console.print()
    if RICH:
        console.print(Panel.fit(
            f"[bold red]ZeroBank Attack Simulation[/bold red]\n"
            f"[dim]Target:[/dim] [cyan]{FASTAPI_URL}[/cyan]\n"
            f"[dim]Threads:[/dim] [white]{args.threads}[/white]   "
            f"[dim]Delay:[/dim] [white]{args.delay}s[/white]   "
            f"[dim]Mode:[/dim] [{mode_color}]{mode_label}[/{mode_color}]\n"
            f"[dim]Honeypot probe:[/dim] {'[green]ON[/green]' if args.honeypot else '[dim]OFF[/dim]'}",
            title="[bold]FinShield AI — Demo Attack Script[/bold]",
            border_style="red",
        ))
    else:
        print("=" * 60)
        print("  ZeroBank Attack Simulation")
        print(f"  Target: {FASTAPI_URL} | Threads: {args.threads} | Mode: {args.mode}")
        print("=" * 60)

    console.print(f"[bold {mode_color}]▶ {mode_label}[/bold {mode_color}]")
    console.print("[dim]Press Ctrl+C to stop and see final summary[/dim]\n")


def print_live_log(last_count: int = 0):
    with _lock:
        log = _stats["log"].copy()
        stats = dict(_stats)

    if RICH:
        for ts, email, ip, status, color in log[:5 - last_count]:
            console.print(f"  [dim]{ts}[/dim]  [cyan]{email[:28]:<28}[/cyan]  [dim]{ip:<16}[/dim]  [{color}]{status}[/{color}]")
    else:
        for ts, email, ip, status, color in log[:3]:
            print(f"  {ts}  {email[:28]:<28}  {ip:<16}  {status}")

    return len(log)


# ── Main ──────────────────────────────────────────────────────────────────────
def main():
    parser = argparse.ArgumentParser(description="ZeroBank Attack Simulation — FinShield Demo")
    parser.add_argument("--threads", type=int, default=5, help="Number of parallel attack threads (default: 5)")
    parser.add_argument("--delay", type=float, default=0.5, help="Seconds between attempts per thread (default: 0.5)")
    parser.add_argument("--mode", choices=["slow", "burst"], default="slow", help="Attack mode: slow or burst")
    parser.add_argument("--honeypot", action="store_true", help="Probe honeypot endpoints if session is trapped")
    args = parser.parse_args()

    # Adjust delay based on mode
    if args.mode == "burst":
        args.delay = 0.1
    elif args.mode == "slow":
        if args.delay == 0.5:  # Default — apply slow mode default
            args.delay = 2.0

    render_ui(args)

    threads = []

    # Start attack threads
    for i in range(args.threads):
        t = threading.Thread(target=attack_thread, args=(args, i), daemon=True)
        t.start()
        threads.append(t)

    # Start stats poller
    poller = threading.Thread(target=stats_poller, args=(args,), daemon=True)
    poller.start()

    last_log_len = 0
    try:
        while True:
            time.sleep(1)

            with _lock:
                total = _stats["total_attempts"]
                sessions_created = _stats["sessions_created"]
                detections = _stats["detections"]
                errors = _stats["errors"]

            log_count = print_live_log(0)

            if RICH:
                console.print(
                    f"  [dim]Attempts:[/dim] [white]{total}[/white]  "
                    f"[dim]Sessions:[/dim] [white]{sessions_created}[/white]  "
                    f"[dim]FinShield detections:[/dim] [red bold]{detections}[/red bold]  "
                    f"[dim]Errors:[/dim] [yellow]{errors}[/yellow]",
                    end="\r"
                )
            else:
                print(f"\r  Attempts: {total} | Detections: {detections} | Errors: {errors}    ", end="", flush=True)

    except KeyboardInterrupt:
        _stats["running"] = False
        console.print("\n\n[bold yellow]⚡ Simulation stopped by operator[/bold yellow]\n")

        if RICH:
            console.print(Panel(
                f"[bold]Final Summary[/bold]\n\n"
                f"Total HTTP attempts:     [white]{_stats['total_attempts']}[/white]\n"
                f"Sessions created in DB:  [cyan]{_stats['sessions_created']}[/cyan]\n"
                f"FinShield detections:    [red bold]{_stats['detections']}[/red bold]\n"
                f"Honeypot traps:          [magenta]{_stats['honeypot_traps']}[/magenta]\n"
                f"API errors:              [yellow]{_stats['errors']}[/yellow]\n\n"
                f"[dim]Detection rate: {(_stats['detections'] / max(_stats['sessions_created'], 1)) * 100:.1f}%[/dim]",
                title="[bold red]Attack Simulation Complete[/bold red]",
                border_style="red",
            ))
        else:
            print("\n\nFINAL SUMMARY")
            print(f"  Total attempts:     {_stats['total_attempts']}")
            print(f"  Sessions created:   {_stats['sessions_created']}")
            print(f"  FinShield detected: {_stats['detections']}")


if __name__ == "__main__":
    main()
