import { getRuntimeMode } from '../../src/env/runtimeMode'
import { loadEnvFile } from '../../src/env/loadEnv'

// Load exactly one env file according to runtime mode
// For E2E scripts, default to e2e mode if not explicitly set
if (!process.env.RUNTIME_MODE && !process.env.DOTENV_CONFIG_PATH) {
  process.env.RUNTIME_MODE = 'e2e'
}
const mode = getRuntimeMode()
loadEnvFile(mode)

const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3000'
const loginUrl = new URL('/login', baseUrl).toString()
const warmupRoutes = ['/vendor/schedule']
const attemptTimeoutMs = 10_000
const maxAttempts = 2
const warmupTimeoutMs = 20_000

async function verify(attempt: number): Promise<void> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), attemptTimeoutMs)

  try {
    await fetch(loginUrl, { method: 'GET', signal: controller.signal })
  } catch {
    if (attempt < maxAttempts) {
      return verify(attempt + 1)
    }

    console.error(`’'?O Web server not reachable at ${loginUrl}`)
    console.error(
      `’'?O Preflight gave up after ${attempt} attempt(s) (timeout ${attemptTimeoutMs}ms) hitting ${loginUrl}`
    )
    console.error('Please run `pnpm dev` before running E2E tests.')
    process.exit(1)
  } finally {
    clearTimeout(timeout)
  }
}

await verify(1)

for (const route of warmupRoutes) {
  await warmRoute(route)
}

async function warmRoute(route: string) {
  const url = new URL(route, baseUrl).toString()
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), warmupTimeoutMs)

  try {
    await fetch(url, { signal: controller.signal })
  } catch (error) {
    console.warn(`ƒ?O Route warmup failed for ${route}:`, (error as Error)?.message || error)
  } finally {
    clearTimeout(timeout)
  }
}
