#!/usr/bin/env python3
"""
F8 Red Team Simulation Script
Runs an infinite loop simulating RL agent attack attempts.
Every 4 seconds, picks a random attack type, determines success (15% bypass rate),
and writes results. For demo: prints to stdout and optionally writes to Supabase.
"""

import asyncio
import random
import uuid
from datetime import datetime, timezone

ATTACK_TYPES = [
    "proxy_rotation",
    "behavior_mimic",
    "timing_attack",
    "api_abuse",
    "credential_stuffing_slow",
    "fingerprint_spoof",
    "session_replay",
    "sql_injection_probe",
]

BYPASS_METHODS = {
    "proxy_rotation": "Rotated through residential proxies faster than IP reputation update cycle",
    "behavior_mimic": "Replayed captured human mouse trajectories with added Gaussian noise",
    "timing_attack": "Matched exact request timing distribution of legitimate users",
    "api_abuse": "Used valid OAuth tokens from compromised third-party app",
    "credential_stuffing_slow": "Throttled to 2 req/min per IP, below rate limit threshold",
    "fingerprint_spoof": "Canvas manipulation bypassed WebGL fingerprint hash",
    "session_replay": "Replayed valid session cookies before expiry window",
    "sql_injection_probe": "Used time-based blind injection in search parameter",
}

PATCH_RECOMMENDATIONS = {
    "proxy_rotation": "Implement IP reputation scoring with sliding window. Add ASN-level rate limiting.",
    "behavior_mimic": "Add WebGL renderer hash to fingerprint vector. Implement GPU texture absence check.",
    "timing_attack": "Add entropy analysis on inter-request timing. Flag sessions with suspiciously perfect distributions.",
    "api_abuse": "Implement OAuth token binding to device fingerprint. Add scope validation per endpoint.",
    "credential_stuffing_slow": "Add credential velocity tracking across all IPs for same target account.",
    "fingerprint_spoof": "Cross-reference canvas hash with AudioContext fingerprint. Add font enumeration check.",
    "session_replay": "Implement session token binding to TLS session ID. Add replay detection via nonce.",
    "sql_injection_probe": "Add parameterized query enforcement. Implement WAF rule for time-based blind SQLi patterns.",
}

cumulative_reward = 0.0
total_runs = 0
total_bypasses = 0


async def run_simulation():
    global cumulative_reward, total_runs, total_bypasses

    print("=" * 60)
    print("  FinShield AI — Red Team Agent Simulation")
    print("  Press Ctrl+C to stop")
    print("=" * 60)

    while True:
        attack_type = random.choice(ATTACK_TYPES)
        success = random.random() < 0.15  # 15% bypass rate

        total_runs += 1

        if success:
            total_bypasses += 1
            cumulative_reward += 1.0
            bypass_method = BYPASS_METHODS[attack_type]
            patch = PATCH_RECOMMENDATIONS[attack_type]
        else:
            cumulative_reward -= 0.1
            bypass_method = None
            patch = None

        run = {
            "id": str(uuid.uuid4()),
            "run_type": attack_type,
            "success": success,
            "bypass_method": bypass_method,
            "patch_recommendation": patch,
            "reward_score": round(cumulative_reward, 2),
            "run_at": datetime.now(timezone.utc).isoformat(),
        }

        status = "\033[91mBYPASSED\033[0m" if success else "\033[92mBLOCKED\033[0m"
        print(f"\n[Run #{total_runs}] {attack_type:30s} → {status}")
        if success:
            print(f"  Method: {bypass_method}")
            print(f"  Patch:  {patch}")
        print(f"  Reward: {cumulative_reward:.2f} | Bypass Rate: {total_bypasses}/{total_runs} ({100*total_bypasses/total_runs:.1f}%)")

        await asyncio.sleep(4)


if __name__ == "__main__":
    try:
        asyncio.run(run_simulation())
    except KeyboardInterrupt:
        print(f"\n\nSimulation ended. Total runs: {total_runs}, Bypasses: {total_bypasses}")
