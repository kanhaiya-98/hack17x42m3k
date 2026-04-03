
import os
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter
from fastapi.responses import JSONResponse

# Import the in-memory session store from biometric router
from routers.biometric import sessions as biometric_sessions

router = APIRouter()



@router.post("/reset")
async def demo_reset():
    """
    Clear all recent (< 30 min) demo data from in-memory stores.
    Called by the demo launcher's Reset button.
    Also tries a Supabase delete if credentials are available.
    """
    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=30)

    # ── Clear biometric sessions ──
    stale_sessions = [
        sid for sid, s in biometric_sessions.items()
        if s.get("created_at") and s["created_at"] < cutoff
    ]
    recent_sessions = [
        sid for sid, s in biometric_sessions.items()
        if not s.get("created_at") or s["created_at"] >= cutoff
    ]
    # Remove ALL sessions created within last 30 min too (for demo reset)
    all_recent = [
        sid for sid, s in biometric_sessions.items()
        if s.get("created_at") and s["created_at"] >= cutoff
    ]
    for sid in all_recent:
        biometric_sessions.pop(sid, None)

    cleared_sessions = len(all_recent)

    # ── Try Supabase service-role delete (non-critical, best-effort) ──
    supabase_cleared = False
    try:
        import httpx
        supabase_url = os.getenv("SUPABASE_URL", "")
        service_key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if supabase_url and service_key:
            cutoff_iso = cutoff.isoformat()
            headers = {
                "apikey": service_key,
                "Authorization": f"Bearer {service_key}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            }
            async with httpx.AsyncClient(timeout=5.0) as client:
                for table in ["sessions", "biometric_events", "threat_events", "red_team_runs"]:
                    try:
                        await client.delete(
                            f"{supabase_url}/rest/v1/{table}?created_at=gte.{cutoff_iso}",
                            headers=headers,
                        )
                    except Exception:
                        pass
            supabase_cleared = True
    except Exception:
        pass

    return JSONResponse({
        "status": "reset_complete",
        "cleared_sessions": cleared_sessions,
        "supabase_cleared": supabase_cleared,
        "timestamp": now.isoformat(),
    })


@router.get("/status")
async def demo_status():
    """Return current demo stats — total sessions, flagged, etc."""
    total = len(biometric_sessions)
    flagged = sum(1 for s in biometric_sessions.values() if s.get("bot_confidence", 0) > 0.72)
    return {
        "total_sessions": total,
        "flagged_sessions": flagged,
        "running": True,
    }
