# OpsAI Helpdesk

Diagnostic and recommendation engine for support agents.

## Features

- `diagnose(errorLog, context?)` parses logs and surfaces likely causes.
- `detectAnomalies(metrics)` highlights stuck deployments, slow bookings, and health degradation.
- `recommendActions(context)` produces remediation steps.
- API endpoints exposed under `/api/ops/helpdesk/*`.
- CLI hooks: `opsai helpdesk diagnose ./error.log`, `opsai helpdesk recommend`.

## Development

```bash
pnpm exec tsc -p packages/opsai-helpdesk/tsconfig.json
```
