# OpsAI (Operations Intelligence Layer)

OpsAI is Bookiji's operations intelligence surface - the set of dashboards, SDKs, and tooling that observe deployments, health, incidents, and metrics and then serve them through responsive consoles, voice narration, and programmable playbooks.

## What ships today?

- **Control plane** (`apps/opsai-control-plane/`): Vite + React dashboard for agents, playbooks, and voice output. It uses the OpsAI SDK to drive `/api/ops/controlplane/*` and gives operators a command console, event stream, and narrated summaries.
- **SDK packages** (`packages/opsai-sdk/`): Typed `OpsAI` client, cache, webhook helpers, and CLI that front the `ops` REST surface (summary, metrics, health, deployments, webhooks).
- **Helpdesk / L7 tooling** (`packages/opsai-helpdesk/`, `packages/opsai-l7/`): Domain-specific tooling that powers diagnostics, predictive guardrails, and human-reviewed playbooks.
- **Voice console** (`packages/opsai-voice/` -> `dist/voice-console/`): Browser-based SSE player that narrates summaries, health changes, deployments, and anomaly alerts (uses Web Speech).

Refer to this hub and the control-plane README for the details of each layer.

## Where in the repo is it?

- `apps/opsai-control-plane/` - OpsAI dashboard, command console, and voice panel (Vite + React).
- `packages/opsai-sdk/` - Shared OpsAI client, cache, CLI helpers, and webhook builders.
- `packages/opsai-helpdesk/` - Diagnostic helpers that plug into the control plane and OpsAI services.
- `packages/opsai-l7/` - Layer-7 reliability policies, synthetic checks, and prediction helpers.
- `packages/opsai-voice/` - Voice console source and build artifacts (`dist/voice-console/`).
- `src/app/api/ops/` - Next.js server routes (summary, health, deployments, events, control plane, helpdesk, L7, logs, anomalies, etc.).
- `src/app/admin/ops-ai/` - Built-in admin console that mirrors the OpsAI Commander view.
- `scripts/ops-events-store.ts` & `scripts/ops-smoke-test.ts` - Event capture and CI smoke tests that exercise the OpsAI surface.
- `src/opsai/` - Reasoning helpers (v1/v2) that feed analytics envelopes and artifacts when OpsAI needs contextual insight.

## How to run it locally?

1. **Run the application stack** - `pnpm install` (first time) then `pnpm dev` to launch the Next.js app on `http://localhost:3000`. This exposes `/api/ops/*`, `/api/simcity/*`, and the admin console.
   - Toggle `NEXT_PUBLIC_OPS_MODE=simcity` to pull summaries from SimCity snapshots. When SimCity mode is active, `NEXT_PUBLIC_SITE_URL` must point to your dev host.
   - `OPS_API_BASE`, `NEXT_PUBLIC_OPS_BASE`, or `NEXT_PUBLIC_SITE_URL` are used by `src/app/api/ops/summary/route.ts` to reach the Ops Fabric API; set one if the runtime cannot derive the origin automatically.
2. **Start the OpsAI control plane** - `VITE_OPS_BASE=http://localhost:3000 pnpm --dir apps/opsai-control-plane dev`. The control plane uses `VITE_OPS_BASE` (falling back to `window.location.origin`) to call `http://localhost:3000/api/ops/controlplane/*`.
3. **Build or serve the voice console** - run `pnpm --dir packages/opsai-voice run build` to emit `dist/voice-console/`. Serve it (e.g., `npx serve dist/voice-console`) so operators can click the buttons that hit `/api/ops/summary`, `/api/ops/health`, `/api/ops/deployments`, and `/api/ops/events/stream`.

## Integration points

- The OpsAI control plane and admin consoles consume `src/app/api/ops/*` routes for metrics, health, deployments, acknowledgements, playbooks, and command telemetry.
- `packages/opsai-sdk` is the client shipped to every OpsUI surface (control plane, admin, voice) so they share caching, retries, and webhook helpers.
- `packages/opsai-helpdesk` and `packages/opsai-l7` implement the domain policies that feed `apps/opsai-control-plane` playbooks, recommended checks, and synthetic predictions.
- `packages/opsai-voice` listens to SSE from `/api/ops/events/stream`, hits `/api/ops/summary`, `/api/ops/health`, and `/api/ops/deployments`, and renders spoken responses with Web Speech.
- `scripts/ops-events-store.ts` is the write-ahead store that populates the event stream, and `scripts/ops-smoke-test.ts` exercises the `/api/ops` surface in CI.
- `src/app/admin/ops-ai` mirrors the OpsAI Commander view and relies on the same `ops` routes plus `packages/opsai-sdk` for formatting.

## Security / permissions

Every OpsAI surface exposed in Next.js sits behind the admin gate:

- `src/app/admin/layout.tsx` calls `/api/auth/check-admin`, which inspects `profiles.role === 'admin'`, looks up `user_roles` entries, and optionally grants access when `ADMIN_ORG_IDS` matches the user's organization (`src/app/api/auth/check-admin/route.ts`).
- Core server helpers like `requireAdmin` (`src/lib/auth/requireAdmin.ts`) validate the Supabase session before allowing OpsAI mutations or control-plane commands to run.
- The OpsAI control plane (`apps/opsai-control-plane`) is a standalone Vite app meant for internal, authenticated networks - keep it behind a VPN or firewall, since it does not implement its own auth.
- Voice console assets (`dist/voice-console/`) are static and call the same `/api/ops` routes; in production they should be served from a secure bucket or behind the same SSO guard as the admin console.

Operators should keep these APIs behind admin credentials (Supabase `admin` role or configured org) to avoid exposing OpsAI telemetry to the public internet.
