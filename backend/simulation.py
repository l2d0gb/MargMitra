"""Deterministic in-memory emergency traffic simulation for the hackathon MVP."""
from __future__ import annotations

import asyncio
import math
from datetime import datetime, timezone
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


class Ambulance(BaseModel):
    id: str
    lat: float
    lng: float
    speed: float
    route_points: list[dict[str, float]]
    target_signal_id: str | None = None
    status: str = "EMERGENCY"


class Signal(BaseModel):
    id: str
    lat: float
    lng: float
    status: str = "RED"
    distance_to_ambulance: float = 0.0


class Incident(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    lat: float
    lng: float
    severity: int = Field(ge=1, le=5)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    verified: bool = False
    priority_score: float = 0.0
    density: float = 1.0
    impact_radius_m: int = 0
    impact_coordinates: list[dict[str, float]] = Field(default_factory=list)


def _route() -> list[dict[str, float]]:
    # Fifteen waypoints follow a compact loop through central Bengaluru.
    return [
        {"lat": 12.9716, "lng": 77.5946}, {"lat": 12.9730, "lng": 77.5946},
        {"lat": 12.9744, "lng": 77.5947}, {"lat": 12.9758, "lng": 77.5948},
        {"lat": 12.9772, "lng": 77.5948}, {"lat": 12.9786, "lng": 77.5949},
        {"lat": 12.9798, "lng": 77.5954}, {"lat": 12.9800, "lng": 77.5968},
        {"lat": 12.9799, "lng": 77.5982}, {"lat": 12.9786, "lng": 77.5983},
        {"lat": 12.9772, "lng": 77.5982}, {"lat": 12.9758, "lng": 77.5981},
        {"lat": 12.9744, "lng": 77.5980}, {"lat": 12.9730, "lng": 77.5978},
        {"lat": 12.9716, "lng": 77.5976},
    ]


def distance_m(a: dict[str, float], b: dict[str, float]) -> float:
    radius = 6_371_000
    lat1, lat2 = math.radians(a["lat"]), math.radians(b["lat"])
    dlat = lat2 - lat1
    dlng = math.radians(b["lng"] - a["lng"])
    h = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlng / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(h))


def circle_coordinates(lat: float, lng: float, radius_m: int = 1000, steps: int = 48) -> list[dict[str, float]]:
    """Return a closed [lat,lng] perimeter suitable for Leaflet GeoJSON/polygons."""
    points = []
    for index in range(steps + 1):
        bearing = 2 * math.pi * index / steps
        points.append({
            "lat": lat + (radius_m / 111_320) * math.cos(bearing),
            "lng": lng + (radius_m / (111_320 * math.cos(math.radians(lat)))) * math.sin(bearing),
        })
    return points


class Simulation:
    def __init__(self) -> None:
        self.route = _route()
        self.route_index = 0
        self.ambulance = Ambulance(id="AMB-01", **self.route[0], speed=38.0, route_points=self.route)
        # About 300 m apart along the northbound section of the route.
        self.signals = [
            Signal(id=f"SIG-{i + 1:02d}", lat=self.route[2 + i * 2]["lat"], lng=self.route[2 + i * 2]["lng"])
            for i in range(5)
        ]
        self.incidents: list[Incident] = []
        self.started_at = datetime.now(timezone.utc)
        self.tick_count = 0
        self.preemptions = 0
        self.congestion_level = 0.42
        self.response_samples = [14.2, 12.8, 11.6, 9.7, 8.4, 7.2, 6.1]
        self.last_preempted: set[str] = set()

    def _update_signals(self) -> None:
        current = {"lat": self.ambulance.lat, "lng": self.ambulance.lng}
        for signal in self.signals:
            signal.distance_to_ambulance = round(distance_m(current, {"lat": signal.lat, "lng": signal.lng}))
            signal.status = "RED"
        upcoming = sorted(self.signals, key=lambda item: item.distance_to_ambulance)
        within_range = [s for s in upcoming if s.distance_to_ambulance <= 500]
        preempted = within_range[:2]
        for signal in preempted:
            signal.status = "PREEMPTED"
        self.ambulance.target_signal_id = upcoming[0].id if upcoming else None
        now_ids = {s.id for s in preempted}
        if now_ids - self.last_preempted:
            self.preemptions += 1
        self.last_preempted = now_ids

    def step(self) -> dict[str, Any]:
        self.route_index = (self.route_index + 1) % len(self.route)
        self.ambulance.lat = self.route[self.route_index]["lat"]
        self.ambulance.lng = self.route[self.route_index]["lng"]
        self.tick_count += 1
        self.congestion_level = round(0.35 + 0.12 * (0.5 + 0.5 * math.sin(self.tick_count / 8)), 2)
        self._update_signals()
        return self.telemetry()

    def create_incident(self, lat: float, lng: float, severity: int) -> Incident:
        density = round(0.45 + ((int(abs(lat * 1000) + abs(lng * 1000)) % 50) / 100), 2)
        elapsed_minutes = max((datetime.now(timezone.utc) - self.started_at).total_seconds() / 60, 0.1)
        priority = round(severity * density * elapsed_minutes, 2)
        impact = circle_coordinates(lat, lng) if severity > 3 else []
        incident = Incident(lat=lat, lng=lng, severity=severity, density=density,
                            priority_score=priority, impact_radius_m=1000 if severity > 3 else 0,
                            impact_coordinates=impact)
        self.incidents.insert(0, incident)
        return incident

    def verify_incident(self, incident_id: str, verified: bool) -> Incident | None:
        incident = next((item for item in self.incidents if item.id == incident_id), None)
        if incident:
            incident.verified = verified
        return incident

    def metrics(self) -> dict[str, Any]:
        reliability = min(99.5, 86 + self.preemptions * 1.4 + min(self.tick_count / 100, 5))
        return {
            "average_response_time_min": round(sum(self.response_samples) / len(self.response_samples), 1),
            "baseline_response_time_min": 14.2,
            "preempted_response_time_min": 6.1,
            "response_time_saved_min": 8.1,
            "green_corridor_reliability_index": round(reliability, 1),
            "active_congestion_level": self.congestion_level,
            "active_incidents": len([i for i in self.incidents if not i.verified]),
            "preemption_events": self.preemptions,
            "response_trend": [{"run": i + 1, "minutes": value} for i, value in enumerate(self.response_samples)],
        }

    def telemetry(self) -> dict[str, Any]:
        return {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ambulance": self.ambulance.model_dump(mode="json"),
            "signals": [signal.model_dump(mode="json") for signal in self.signals],
            "incidents": [incident.model_dump(mode="json") for incident in self.incidents],
            "alerts": [
                {"type": "PREEMPTION", "message": f"Green corridor active at {s.id}", "signal_id": s.id}
                for s in self.signals if s.status == "PREEMPTED"
            ],
            "route_density": [
                {"from": self.route[i], "to": self.route[i + 1],
                 "density": ["LOW", "MEDIUM", "HIGH"][i % 3]}
                for i in range(len(self.route) - 1)
            ],
            "metrics": self.metrics(),
        }

    async def run(self, broadcast) -> None:
        while True:
            await asyncio.sleep(1)
            payload = self.step()
            await broadcast(payload)
