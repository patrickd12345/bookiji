# Phase 14 Baseline Run Log (Template)

> Make a timestamped copy of this file before filling it out. Do not edit after completion.

## Run identification
- Phase: 14 (Baseline City Soak)
- Run label: phase14-baseline-<timestamp>
- Start timestamp (UTC): <iso8601>
- Planned duration: <e.g., 6h/24h>
- Controller (person/agent): <name>

## Environment fingerprint
- Git SHA: <commit>
- Deployment fingerprint path: ops/phase14/fingerprints/<timestamp>-fingerprint.json
- SIMCITY_ALLOWED: <true/false>
- BOOKIJI_ENV: <dev/staging>
- SIMCITY_TARGET_BASE_URL: <value>

## SimCity start
- Start command/endpoint: <e.g., POST /api/simcity/start>
- Scenario ID: <auto/default>
- Seed (if set): <value or default>
- Policies: default (no overrides)
- Notes on initial state: <load, queues, DB health>

## Passive observations during soak
- Request volume distribution notes:
- Endpoint hit frequency notes:
- Latency percentiles (p50/p95/p99) summary:
- Error rates and classes observed:
- Retry occurrences observed:
- DB read/write ratio trends:
- Payment intent creation patterns:
- Naturally rare but valid sequences:
- Timing jitter or load variance highlights:

## Issues / safety interventions
- Were there any interventions? (If yes, restart Phase 14 from zero): <yes/no>
- Notes:

## Synthetic purge
- Purge executed at (UTC): <iso8601>
- Residue check: <clean/notes>

## Artifact index
- Metrics artifacts: ops/phase14/<timestamp>/phase14-baseline-artifacts.json
- Additional attachments: <links/paths>
