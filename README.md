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
2. Choose origin, destination and vehicle, then find a route. Compare or select the three ranked alternatives.
3. Select Ambulance, Fire, Police or Emergency to expose current + three upcoming illustrative checkpoints.
4. Open Demo fleet, select AMB-02, and simulate unit unavailable. Available units are ranked by graph ETA + two-minute preparation time.
5. Acknowledge dispatch to mark the recommendation EN ROUTE in the demo only. Repeat disruptions to exercise the no-replacements state.
6. Ask a free-text question. The question is answered using a snapshot of traffic, forecast, density, route, vehicle, checkpoints, fleet, safety and data information.
7. Reset demo restores the starting state. Data & methodology includes a station selector and source downloads.

## Data and provenance

- **Traffic Monitor Lizard / Mahesh Shantaram (2026)**: https://github.com/thecont1/traffic-monitor-lizard, CC BY 4.0. 72 historical snapshots from 2026-09-24. Extracted from `data/csv-traffic-bangalore.csv`; speeds calculated from recorded distance and duration. Attribution/license preserved in `public/data/TRAFFIC-LICENSE.md`. `provenance.json` records downloaded source hashes.
- **Hugging Face / kalyan1729 / trafficmanagementdataset**: 50 BMD-45-Train and 50 UVH-26-Train images, COCO annotation counts. Python random.Random(42), stratified across image-id order among annotation matches in the first 1,000 hosted file entries in BMD images_000 and UVH data/000. This is an availability-constrained sample, not a representative citywide sample. Images resized to at most 640×360. Source license metadata is retained in density.json. No test/validation/video, DETRAC or IITM-HeTra_v2 data is included.
- **OpenCity / Bengaluru Traffic Police**: https://data.opencity.in/dataset/bengaluru-road-crashes-data, 2024 station table. Subtotals excluded to prevent double counting: 50 stations, 4,800 total crashes and 852 fatal crashes. Fatal crashes are events, not fatalities.
- **OpenCity / KRDCL**: https://data.opencity.in/dataset/bengaluru-high-density-corridors-documents. 2020 HDC report metadata retained in `corridor-reference.json`. This is a report reference, not imported official GIS geometry.

The processed dataset is about 5 MB. Raw downloads are ignored by source control and not published. `scripts/prepare-data.py` documents the deterministic transformation and image selection; regeneration requires source CSV/COCO files and the recorded Hugging Face file listings under ignored `data-raw/`, plus Python/Pillow. The application uses only the committed processed output.

## Model limitations

- The map is a connected, hand-authored corridor graph with approximate geometry. Source route speeds are attached to matching corridor names; segment distances and ETAs are modeled separately. It is not a navigation engine.
- Some links have no matching observation and explicitly use a modeled speed derived from the network mean. Congestion is a demo index relative to 45 km/h, clamped to 0–95.
- Forecast = current speed + 0.4 × (current − previous speed), clamped to 5–55 km/h. The 15-minute horizon is an unvalidated heuristic.
- Route score = ETA + mean congestion × 0.045 (normal) or 0.13 (emergency) + bottlenecks × 1 or 4 + 1.5 per link after the first two. Paths are continuous and cycle-free, limited to seven links. The three lowest scores are shown.
- Lookahead uses four interpolated checkpoints along the chosen graph path; locations are illustrative, not verified signalized junctions.
- Density is an independent image sample, not tied to the replay location/time. Thresholds: 0–10 LOW, 11–30 MEDIUM, 31+ HIGH.
- Safety data is station-level historical context, not accident prediction or a route risk score.
- No live BTP CCTV, ambulance GPS, actual dispatch, automatic signal control, government partnership or guaranteed ETA.
- Map tiles and optional fonts require network access; local corridor geometry and core functionality remain available without tiles. Map attribution remains visible.

## Optional AI

The public deployment intentionally has no API key and labels responses **SYSTEM-DATA FALLBACK**. This is deterministic state-aware explanation, not an LLM. Unknown questions are explicitly reported as unsupported.

To enable the Express AI adapter, set server-side `OPENAI_API_KEY` and optionally `OPENAI_MODEL` (default `gpt-4.1-mini`), then run `node --env-file=.env server.mjs`. Never put an API key in `VITE_` variables or browser code. An AI request is made only on submission, with the question plus current state; provider errors fall back to the local explanation. The optional adapter is suitable for a local demo; add access controls and rate limiting before exposing a key-backed API publicly.

## Verification

`pnpm test` covers historical arithmetic, changing frames, all supported endpoint pairs, route continuity/cycles, emergency scoring/lookahead, replacement exclusions and empty availability, density thresholds, annotation integrity, and grounded assistant behavior.

Browser acceptance checks: landing/navigation, replay previous/next/play/pause/speed/reset, route inputs/alternatives, emergency checkpoints, failure simulation, replacement acknowledgement, assistant current-state answer, data station selector, desktop/mobile overflow. The real AI provider is not tested without a key.

## Structure

- `src/main.jsx`: React UI and coordinated state.
- `src/engine.mjs`: pure traffic/routing/fleet/assistant logic.
- `src/style.css`: responsive visual system.
- `server.mjs`: optional Express API and production static server.
- `public/data/`: self-contained processed data and attribution.
- `tests/engine.test.mjs`: functional domain checks.
- `.openai/hosting.json`: Sites deployment identity.
