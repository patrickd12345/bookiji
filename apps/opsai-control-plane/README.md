# OpsAI Control Plane

Unified React + Vite dashboard for Bookiji OpsAI.

## Run

```bash
cd apps/opsai-control-plane
pnpm install
pnpm dev
```

Build and preview:

```bash
pnpm build
pnpm preview
```

## What’s inside
- Health overview, metrics, deployments, incidents, agent grid (RegressionAI, MetricsAI, LogsAI, DeployAI, HelpdeskAI, L7ReliabilityAI)
- Command console for control commands (`restart api`, `flush cache`, `trigger synthetic-check`, `recalc risk`)
- Playbooks list + hot-state evaluation, time-machine (state at T and diff), L7 predictions, voice console (narrator text)
- Event stream status and hooks to `/api/ops/controlplane/events`

## Integration points
- OpsAI SDK for summary/metrics/deployments/incidents
- Helpdesk diagnostics for insights and playbook triggers
- L7 reliability module for predictions and synthetic checks
- Control Plane API namespace under `/api/ops/controlplane/*`

## Panels
- **HealthOverview**: Persona-formatted summary + service status.
- **MetricsPanel**: Bookings + system metrics counts with safe fallbacks.
- **DeploymentsTimeline**: Deployments with empty-state copy.
- **IncidentsList**: Severity and descriptions.
- **AgentsGrid**: Orchestration view for RegressionAI, MetricsAI, LogsAI, DeployAI, HelpdeskAI, L7ReliabilityAI.
- **PlaybooksPanel**: Lists playbooks and highlights “hot” matches.
- **TimeMachinePanel**: Snapshot-at-time and diff.
- **CommandConsole**: Command history, responses, timestamps.
- **VoicePanel**: Narrator persona text for voice/broadcast use.
- **EventStreamStatus**: SSE connectivity indicator.
