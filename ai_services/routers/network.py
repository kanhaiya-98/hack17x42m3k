"""
F3 — Network Intelligence Router
Simulates geo resolution, network graph, and heatmap.
"""

import uuid
import random
import hashlib
from datetime import datetime, timezone

from fastapi import APIRouter

from models.schemas import (
    NetworkIngestRequest,
    NetworkIngestResponse,
    GeoInfo,
)

router = APIRouter()

# In-memory store
network_sessions: dict[str, dict] = {}

# Mock geo data keyed by IP prefix patterns
_GEO_MAP = {
    "10.": {"country": "India", "city": "Mumbai", "lat": 19.076, "lon": 72.8777, "asn": "AS9829", "isp": "BSNL"},
    "172.16": {"country": "India", "city": "Bangalore", "lat": 12.9716, "lon": 77.5946, "asn": "AS18209", "isp": "Airtel"},
    "192.168": {"country": "India", "city": "Delhi", "lat": 28.6139, "lon": 77.209, "asn": "AS55836", "isp": "Reliance Jio"},
    "103.": {"country": "China", "city": "Shanghai", "lat": 31.2304, "lon": 121.4737, "asn": "AS4134", "isp": "ChinaNet"},
    "185.": {"country": "Russia", "city": "Moscow", "lat": 55.7558, "lon": 37.6173, "asn": "AS12389", "isp": "Rostelecom"},
    "45.": {"country": "Nigeria", "city": "Lagos", "lat": 6.5244, "lon": 3.3792, "asn": "AS37148", "isp": "SubCom"},
    "77.": {"country": "Iran", "city": "Tehran", "lat": 35.6892, "lon": 51.389, "asn": "AS44244", "isp": "Irancell"},
    "91.": {"country": "Ukraine", "city": "Kyiv", "lat": 50.4501, "lon": 30.5234, "asn": "AS15895", "isp": "Kyivstar"},
}

_INDIA_CITIES = [
    {"city": "Mumbai", "lat": 19.076, "lon": 72.8777},
    {"city": "Delhi", "lat": 28.6139, "lon": 77.209},
    {"city": "Bangalore", "lat": 12.9716, "lon": 77.5946},
    {"city": "Chennai", "lat": 13.0827, "lon": 80.2707},
    {"city": "Hyderabad", "lat": 17.385, "lon": 78.4867},
    {"city": "Kolkata", "lat": 22.5726, "lon": 88.3639},
    {"city": "Pune", "lat": 18.5204, "lon": 73.8567},
]


def _resolve_geo(ip: str) -> GeoInfo:
    for prefix, geo in _GEO_MAP.items():
        if ip.startswith(prefix):
            return GeoInfo(**geo)
    # Default: random Indian city
    city = random.choice(_INDIA_CITIES)
    return GeoInfo(
        country="India",
        city=city["city"],
        lat=city["lat"] + random.uniform(-0.05, 0.05),
        lon=city["lon"] + random.uniform(-0.05, 0.05),
        asn="AS9829",
        isp="BSNL",
    )


def _clustering_score(ip: str, fingerprint_id: str) -> float:
    """Simulate clustering score based on how many sessions share fingerprint."""
    matching = sum(1 for s in network_sessions.values() if s["fingerprint_id"] == fingerprint_id)
    base = min(1.0, matching * 0.15)
    # Add some deterministic noise based on IP
    noise = (int(hashlib.md5(ip.encode()).hexdigest()[:4], 16) % 20) / 100
    return round(min(1.0, base + noise), 4)


@router.post("/ingest", response_model=NetworkIngestResponse)
async def network_ingest(req: NetworkIngestRequest):
    """Ingest session network data and return geo + clustering score."""
    geo = _resolve_geo(req.ip)
    score = _clustering_score(req.ip, req.fingerprint_id)

    network_sessions[req.session_id] = {
        "session_id": req.session_id,
        "ip": req.ip,
        "fingerprint_id": req.fingerprint_id,
        "user_agent": req.user_agent,
        "bank_id": req.bank_id,
        "geo": geo.model_dump(),
        "clustering_score": score,
        "ingested_at": datetime.now(timezone.utc).isoformat(),
    }

    return NetworkIngestResponse(
        session_id=req.session_id,
        geo=geo,
        clustering_score=score,
    )


@router.get("/graph")
async def network_graph():
    """Return mock network graph with ~15 nodes and edges."""
    random.seed(42)  # Deterministic for demo
    nodes = []
    edges = []

    # Create IPs as nodes
    ips = [f"103.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(6)]
    ips += [f"185.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(3)]
    ips += [f"10.0.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(4)]
    ips += [f"45.{random.randint(1,255)}.{random.randint(1,255)}.{random.randint(1,255)}" for _ in range(2)]

    fingerprints = [f"fp_{uuid.uuid4().hex[:8]}" for _ in range(5)]

    for i, ip in enumerate(ips):
        fp = fingerprints[i % len(fingerprints)]
        is_malicious = ip.startswith("103.") or ip.startswith("185.")
        nodes.append({
            "id": f"node_{i}",
            "ip": ip,
            "fingerprint_id": fp,
            "type": "attacker" if is_malicious else "legitimate",
            "sessions": random.randint(1, 20 if is_malicious else 3),
            "bot_confidence": round(random.uniform(0.7, 0.98) if is_malicious else random.uniform(0.02, 0.3), 3),
        })

    # Cluster edges — malicious IPs share fingerprints
    for i in range(len(nodes)):
        for j in range(i + 1, len(nodes)):
            if nodes[i]["fingerprint_id"] == nodes[j]["fingerprint_id"]:
                edges.append({
                    "source": nodes[i]["id"],
                    "target": nodes[j]["id"],
                    "relationship": "shared_fingerprint",
                    "weight": round(random.uniform(0.6, 1.0), 2),
                })
            elif random.random() < 0.15:
                edges.append({
                    "source": nodes[i]["id"],
                    "target": nodes[j]["id"],
                    "relationship": "temporal_proximity",
                    "weight": round(random.uniform(0.1, 0.4), 2),
                })

    random.seed()  # Reset seed
    return {"nodes": nodes, "edges": edges, "total_nodes": len(nodes), "total_edges": len(edges)}


@router.get("/heatmap")
async def network_heatmap():
    """Return mock heatmap arcs — India-centric attack origins."""
    target = {"lat": 19.076, "lon": 72.8777, "city": "Mumbai", "country": "India"}

    origins = [
        {"lat": 31.23, "lon": 121.47, "city": "Shanghai", "country": "China", "attack_count": 1847, "severity": "critical"},
        {"lat": 55.75, "lon": 37.62, "city": "Moscow", "country": "Russia", "attack_count": 1203, "severity": "high"},
        {"lat": 6.52, "lon": 3.38, "city": "Lagos", "country": "Nigeria", "attack_count": 892, "severity": "high"},
        {"lat": 35.69, "lon": 51.39, "city": "Tehran", "country": "Iran", "attack_count": 567, "severity": "medium"},
        {"lat": 50.45, "lon": 30.52, "city": "Kyiv", "country": "Ukraine", "attack_count": 423, "severity": "medium"},
        {"lat": 39.90, "lon": 116.40, "city": "Beijing", "country": "China", "attack_count": 1156, "severity": "critical"},
        {"lat": -23.55, "lon": -46.63, "city": "Sao Paulo", "country": "Brazil", "attack_count": 334, "severity": "medium"},
        {"lat": 14.60, "lon": 120.98, "city": "Manila", "country": "Philippines", "attack_count": 278, "severity": "low"},
        {"lat": 1.35, "lon": 103.82, "city": "Singapore", "country": "Singapore", "attack_count": 189, "severity": "low"},
        {"lat": 28.61, "lon": 77.21, "city": "Delhi", "country": "India", "attack_count": 156, "severity": "low"},
    ]

    arcs = []
    for origin in origins:
        arcs.append({
            "origin": {"lat": origin["lat"], "lon": origin["lon"], "city": origin["city"], "country": origin["country"]},
            "target": target,
            "attack_count": origin["attack_count"],
            "severity": origin["severity"],
            "attack_types": random.sample(
                ["credential_stuffing", "ddos", "sql_injection", "xss", "bot_scraping", "api_abuse"],
                k=random.randint(1, 3),
            ),
        })

    return {
        "target": target,
        "arcs": arcs,
        "total_attacks": sum(o["attack_count"] for o in origins),
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
