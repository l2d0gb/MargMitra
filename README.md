# MargMitra AI

AI-Powered Adaptive Urban Traffic & Emergency Mobility Intelligence.

**Predict the traffic ahead. Prioritize the journey that matters most.**

## Run

Requirements: Node.js 22+, pnpm. All runtime data is bundled; no dataset downloads are needed.

```sh
pnpm install
pnpm dev
```

Open the Vite URL (normally http://127.0.0.1:5173). In a second terminal, `pnpm server` starts the optional Express API on port 3001. Vite proxies `/api` there. Without the API, the assistant uses the same labeled system-data fallback in the browser.

```sh
pnpm test
pnpm build
pnpm server
```

After building, Express serves the production app at http://127.0.0.1:3001. The public Sites deployment serves the self-contained Vite build and uses the browser fallback. It does not include an Express process or a configured AI key.

## Demo path

1. Open the Command Center; advance the historical replay or play it at 0.5–4×.
2. Choose origin, destination and vehicle, then find a route. Compare available OSRM alternatives. Select a traffic dataset, then use Simulate journey for a 30-second preview along the actual road path.
3. Select Ambulance, Fire, Police or Emergency to expose the current position and up to three upcoming road maneuvers.
4. Open Demo fleet, select AMB-02, and simulate unit unavailable. Available units are ranked by road-route ETA + two-minute preparation time.
5. Acknowledge dispatch to mark the recommendation EN ROUTE in the demo only. Repeat disruptions to exercise the no-replacements state.
6. Ask a free-text question. The question is answered using a snapshot of traffic, forecast, density, route, vehicle, checkpoints, fleet, safety and data information.
7. Reset demo restores the starting state. Data & methodology includes a station selector and source downloads.

## Data and provenance

- **Kaggle / Preetham Gouda / Bangalore's Traffic Pulse**, version 1, CC0: https://www.kaggle.com/datasets/preethamgouda/banglore-city-traffic-dataset. 8,936 records across 952 dates, 2022-01-01 through 2024-08-09, covering 16 named roads/intersections. Community-uploaded daily historical data; collection methodology is not independently verified. No coordinates or time-of-day are supplied. `scripts/prepare-kaggle.py` transforms the source CSV into bundled daily frames.
- **OpenStreetMap via OSRM**, ODbL attribution: `public/data/roads.json` caches driving routes for all 132 directional pairs among the 12 selectable locations, including returned alternatives and maneuver geometry. `scripts/prepare-roads.mjs` regenerates the cache with paced requests. Reverse journeys are independently routed for one-way roads.

- **Traffic Monitor Lizard / Mahesh Shantaram (2026)**: https://github.com/thecont1/traffic-monitor-lizard, CC BY 4.0. 72 historical snapshots from 2026-09-24. Extracted from `data/csv-traffic-bangalore.csv`; speeds calculated from recorded distance and duration. Attribution/license preserved in `public/data/TRAFFIC-LICENSE.md`. `provenance.json` records downloaded source hashes.
- **Hugging Face / kalyan1729 / trafficmanagementdataset**: 50 BMD-45-Train and 50 UVH-26-Train images, COCO annotation counts. Python random.Random(42), stratified across image-id order among annotation matches in the first 1,000 hosted file entries in BMD images_000 and UVH data/000. This is an availability-constrained sample, not a representative citywide sample. Images resized to at most 640×360. Source license metadata is retained in density.json. No test/validation/video, DETRAC or IITM-HeTra_v2 data is included.
- **OpenCity / Bengaluru Traffic Police**: https://data.opencity.in/dataset/bengaluru-road-crashes-data, 2024 station table. Subtotals excluded to prevent double counting: 50 stations, 4,800 total crashes and 852 fatal crashes. Fatal crashes are events, not fatalities.
- **OpenCity / KRDCL**: https://data.opencity.in/dataset/bengaluru-high-density-corridors-documents. 2020 HDC report metadata retained in `corridor-reference.json`. This is a report reference, not imported official GIS geometry.

Raw downloads are ignored by source control and not published. `scripts/prepare-data.py` documents the deterministic transformation and image selection; regeneration requires source CSV/COCO files and the recorded Hugging Face file listings under ignored `data-raw/`, plus Python/Pillow. The application uses only the committed processed output.

## Model limitations

- Routes use cached OSRM driving geometry. Only returned alternatives are offered; no straight-line fallback is drawn. The moving marker interpolates by distance along this path; movement is accelerated simulation, not live navigation.
- Traffic is applied only to matching normalized road names. Matched steps use historical speed to estimate travel time. Unmatched sections retain OSRM driving-profile estimates. Route cards show the percentage of distance matched to traffic data; no neighboring road's record is substituted.
- Kaggle provides congestion values. Other congestion estimates use a demo 45 km/h reference. Background corridor summaries without matching observations use a labeled network estimate.
- Forecast = current speed + 0.4 × (current − previous speed), clamped to 5–55 km/h. This is an unvalidated next-record trend for daily Kaggle data (dates may have gaps), or a 15-minute heuristic for Monitor Lizard.
- Route score = estimated minutes + distance-weighted congestion × 0.045 (normal) or 0.13 (emergency) + bottlenecks × 1 or 4.
- Lookahead uses the current position and up to three upcoming maneuvers on the road geometry. Signal locations and status are not verified.
- Density is an independent image sample, not tied to the replay location/time. Thresholds: 0–10 LOW, 11–30 MEDIUM, 31+ HIGH.
- Safety data is station-level historical context, not accident prediction or a route risk score.
- No live BTP CCTV, ambulance GPS, actual dispatch, automatic signal control, government partnership or guaranteed ETA.
- Map tiles and optional fonts require network access; local corridor geometry and core functionality remain available without tiles. Map attribution remains visible.

## Optional AI

The public deployment intentionally has no API key and labels responses **SYSTEM-DATA FALLBACK**. This is deterministic state-aware explanation, not an LLM. Unknown questions are explicitly reported as unsupported.

To enable the Express AI adapter, set server-side `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4.1-mini`), then run `node --env-file=.env server.mjs`. Never put an API key in `VITE_` variables or browser code. An AI request is made only on submission, with the question plus current state; provider errors fall back to the local explanation. The optional adapter is suitable for a local demo; add access controls and rate limiting before exposing a key-backed API publicly.

## Verification

`pnpm test` covers historical arithmetic, changing frames, all supported endpoint pairs, cached road geometry and endpoint snapping, exact traffic matching, distance-based movement, emergency scoring/lookahead, replacement exclusions and empty availability, density thresholds, annotation integrity, and grounded assistant behavior.

Browser acceptance checks: landing/navigation, replay previous/next/play/pause/speed/reset, route inputs/alternatives, emergency checkpoints, failure simulation, replacement acknowledgement, assistant current-state answer, data station selector, desktop/mobile overflow. The real AI provider is not tested without a key.

## Structure

- `src/main.jsx`: React UI and coordinated state.
- `src/engine.mjs`: pure traffic/routing/fleet/assistant logic.
- `src/road-routing.mjs`: road-step traffic matching, ranking and path interpolation.
- `src/TrafficMap.jsx`: road map and simulated movement.
- `src/style.css`: responsive visual system.
- `server.mjs`: optional Express API and production static server.
- `public/data/`: self-contained processed data and attribution.
- `tests/engine.test.mjs`: functional domain checks.
- `.openai/hosting.json`: Sites deployment identity.

## Citizen reports and incident response

The Command Center includes a session-only accident form and a separate response panel. Select a road on the current route and submit a report. Reports are unverified; the demo models a precautionary 60 m closure and checks the remaining journey. A directed graph assembled from cached OSRM road geometry finds a detour from the current simulated position, preserving one-way directions and the destination. Travel time uses selected historical speeds on matching roads and profile estimates elsewhere. The panel shows receipt, conflict detection, remaining ETA before/after, and local estimated arrival. The previous path is red and dashed.

Run mid-journey accident demo starts an ambulance and injects a labeled scripted report at 18% progress. When possible it chooses a closure ahead with a demonstrable detour. It does not teleport to the original departure point. If cached coverage cannot produce a detour, movement pauses and human review is required. Clear reports resets the journey. Changing endpoints or datasets starts a fresh incident session. Reports are not shared across browsers or sent to emergency services; no backend citizen-report database is connected. Routing is deterministic, not an LLM or verified accident detector. Remaining baseline ETA scales with path distance; simulated motion is accelerated and does not represent actual driving time.

Incident tests cover current-position continuity, directed-road membership, closure avoidance, passed/off-route reports, and unavailable detours.
