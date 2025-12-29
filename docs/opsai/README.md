# OpsAI — Operations Intelligence Layer

## What OpsAI is
OpsAI is the operations intelligence layer for Bookiji. It unifies the control plane, reliability automations, and operator tooling so on-call teams can observe, diagnose, and narrate the state of the platform from one place.

## What ships today
- **Control plane UI** for health, deployments, incidents, and command console interactions.
- **SDK + CLI packages** (`@bookiji/opsai`) for summaries, metrics, deployments, and webhooks.
- **Helpdesk & L7 reliability tooling** for diagnostics, anomaly detection, and synthetic checks.
- **Voice console** that reads Ops updates aloud and listens to live SSE events.

## Where it lives in the repo
- `apps/opsai-control-plane/` — Vite/React dashboard for operators.
- `packages/opsai-sdk/` — typed client + CLI used by the UI and automation hooks.
- `packages/opsai-helpdesk/` — diagnostics and remediation recommendations.
- `packages/opsai-l7/` — L7 reliability signals and synthetic check logic.
- `packages/opsai-voice/` — browser-based narrator for the VoicePanel/console.

## How to run or develop locally
- Install dependencies: `pnpm install` (repo root).
- Control plane: `pnpm --dir apps/opsai-control-plane dev` (or `build` / `preview`) to launch the dashboard.
- SDK: `pnpm exec tsc -p packages/opsai-sdk/tsconfig.json` and `pnpm exec vitest run packages/opsai-sdk/tests` for typed and tested client builds.
- Helpdesk + L7: `pnpm exec tsc -p packages/opsai-helpdesk/tsconfig.json` and `pnpm exec tsc -p packages/opsai-l7/tsconfig.json` to validate the diagnostic engines.
- Voice console: `pnpm --dir packages/opsai-voice run build` (or `dev`) then host `dist/voice-console/index.html` so it can call `/api/ops/*` and SSE endpoints.
- For live data, ensure the main Bookiji Next.js server is running so `/api/ops/controlplane/*`, `/api/ops/helpdesk/*`, `/api/ops/l7/*`, and `/api/ops/events/stream` respond.

## Integration points with core Bookiji systems
- OpsAI surfaces call the Bookiji `/api/ops/*` namespace for summaries, metrics, deployments, incidents, and playbooks.
- The control plane and voice console consume the OpsAI SDK and stream data from `/api/ops/events/stream`.
- Helpdesk and L7 packages plug into the same ops endpoints to surface diagnostics, predictions, and synthetic checks.

## Security / permissions model
- OpsAI lives inside the Bookiji application stack; keep the control plane, helpdesk APIs, and voice console behind authenticated operator roles.
- Protect environment variables and API credentials used by `/api/ops/*` namespaces; avoid exposing the voice console or SSE streams without authentication.
- Follow the same rollout and RBAC patterns used for other admin/ops endpoints when adding new surfaces.
