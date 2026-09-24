# Pulse — Smart Emergency Traffic Management

An in-memory hackathon prototype with a FastAPI simulation backend and a React + Leaflet operations dashboard. The backend uses mock telemetry and does not need a database or API key. OpenStreetMap tiles are used for the map and require an internet connection.

## Run locally

### Backend

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend

In another terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open http://localhost:5173. The dashboard connects to `http://localhost:8000`; set `VITE_API_BASE` if the backend runs elsewhere.

## API

- `GET /api/v1/ambulance`, `/api/v1/signals`, `/api/v1/incidents`, `/api/v1/metrics`, `/api/v1/telemetry`
- `POST /api/v1/incidents` with `{ "lat": 12.9744, "lng": 77.5968, "severity": 4 }`
- `POST /api/v1/verify-incident` with `{ "incident_id": "…", "verified": true }`
- `WS /ws` streams merged telemetry once per second

All state resets when the backend restarts. Incident severity above 3 includes a 1 km impact perimeter.
