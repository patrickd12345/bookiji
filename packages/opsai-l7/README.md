# OpsAI L7 Reliability

Predictive and self-healing engine for OpsAI.

## Features

- Predicts health and booking throughput trends.
- Detects metric shifts.
- Simulated self-healing actions: restart components, flush cache, reset deployment pointers.
- Incident auto-generation when thresholds are crossed.
- Synthetic daily check exposed via `/api/ops/l7/synthetic`.

## Development

```bash
pnpm exec tsc -p packages/opsai-l7/tsconfig.json
```
