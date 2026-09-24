"""FastAPI application for Smart Emergency Traffic Management System."""
from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from simulation import Simulation

simulation = Simulation()
clients: set[WebSocket] = set()


async def broadcast(payload: dict[str, Any]) -> None:
    stale: list[WebSocket] = []
    for client in tuple(clients):
        try:
            await client.send_json(payload)
        except Exception:
            stale.append(client)
    for client in stale:
        clients.discard(client)


@asynccontextmanager
async def lifespan(_: FastAPI):
    task = asyncio.create_task(simulation.run(broadcast))
    yield
    task.cancel()
    try:
        await task
    except asyncio.CancelledError:
        pass


app = FastAPI(title="Smart Emergency Traffic Management", version="1.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class IncidentCreate(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lng: float = Field(ge=-180, le=180)
    severity: int = Field(ge=1, le=5)


class IncidentVerification(BaseModel):
    incident_id: str
    verified: bool


@app.get("/api/v1/ambulance")
async def get_ambulance():
    return simulation.ambulance


@app.get("/api/v1/signals")
async def get_signals():
    return simulation.signals


@app.get("/api/v1/incidents")
async def get_incidents():
    return simulation.incidents


@app.post("/api/v1/incidents", status_code=201)
async def create_incident(payload: IncidentCreate):
    return simulation.create_incident(payload.lat, payload.lng, payload.severity)


@app.post("/api/v1/verify-incident")
async def verify_incident(payload: IncidentVerification):
    incident = simulation.verify_incident(payload.incident_id, payload.verified)
    if incident is None:
        raise HTTPException(status_code=404, detail="Incident not found")
    return incident


@app.get("/api/v1/metrics")
async def get_metrics():
    return simulation.metrics()


@app.get("/api/v1/telemetry")
async def get_telemetry():
    return simulation.telemetry()


@app.get("/api/v1/health")
async def health():
    return {"status": "ok"}


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.add(websocket)
    await websocket.send_json(simulation.telemetry())
    try:
        while True:
            # Keep the connection alive and allow clients to send harmless pings.
            await websocket.receive_text()
    except WebSocketDisconnect:
        clients.discard(websocket)
