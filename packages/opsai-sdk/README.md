# @bookiji/opsai SDK

Typed OpsAI client with retries, caching, webhook helpers, and a CLI.

## Usage

```ts
import { OpsAI } from '@bookiji/opsai'

const opsai = new OpsAI()
const summary = await opsai.summary()
const systemMetrics = await opsai.metrics('system')
const deployments = await opsai.deployments() // always an array
```

### CLI

```bash
pnpm exec opsai summary
pnpm exec opsai metrics system
pnpm exec opsai deployments
pnpm exec opsai webhook register https://example.com/hook
pnpm exec opsai webhook test https://example.com/hook
```

The CLI falls back to cached/offline data when the server is unavailable, ensuring deployments are always represented as an array (possibly empty).

## Development

- `pnpm exec tsc -p packages/opsai-sdk/tsconfig.json`
- `pnpm exec vitest run packages/opsai-sdk/tests`

Caching defaults to 30 seconds and retries twice before returning cached or offline-safe payloads.
