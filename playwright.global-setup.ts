import { execSync } from 'node:child_process'
import { getRuntimeMode } from './src/env/runtimeMode'
import { loadEnvFile } from './src/env/loadEnv'
import { logRuntimeBanner } from './src/env/runtimeBanner'
import { assertNotProduction } from './src/env/productionGuards'

export default async function globalSetup() {
  // Determine runtime mode and load env
  const mode = getRuntimeMode()
  loadEnvFile(mode)
  logRuntimeBanner()

  const allowNoSupabase = process.env.E2E_ALLOW_NO_SUPABASE === 'true' || process.env.E2E_NAVIGATION_ONLY === 'true'

  // NOTE: For production, we do NOT auto-mutate anything during Playwright setup.
  if (mode === 'prod') {
    console.log('⏭️  Skipping user seeding (production environment detected)')
    console.log('   For production, seed manually:')
    console.log('     pnpm tsx scripts/e2e/apply-seed-function-prod.ts')
    console.log('     pnpm e2e:seed\n')
  } else if (allowNoSupabase) {
    console.warn('⏭️  Skipping user seeding (E2E_ALLOW_NO_SUPABASE=true / E2E_NAVIGATION_ONLY=true)')
    console.warn('   Supabase-dependent tests should self-skip in this mode.\n')
  } else if (process.env.E2E_SKIP_SEED === 'true') {
    console.log('⏭️  Skipping user seeding (E2E_SKIP_SEED=true)')
  } else {
    const hasAdminKey = Boolean(process.env.SUPABASE_SECRET_KEY)
    if (!hasAdminKey) {
      console.warn('⚠️  Skipping user seeding: missing SUPABASE_SECRET_KEY.')
      console.warn('   Role-based E2E tests may still pass if the users already exist in Supabase.\n')
    } else {
      execSync('pnpm e2e:seed', { stdio: 'inherit' })
    }
  }

  // Warm Next.js routes to avoid first-hit compile delays causing E2E flake.
  const warmupBaseURL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000'

  const waitFor = async (path: string, timeoutMs = 120_000) => {
    const started = Date.now()
    let lastError: unknown = null
    while (Date.now() - started < timeoutMs) {
      try {
        const res = await fetch(`${warmupBaseURL}${path}`, { redirect: 'manual' as any })
        if (res.status >= 200 && res.status < 500) return
      } catch (err) {
        lastError = err
      }
      await new Promise((r) => setTimeout(r, 500))
    }
    throw new Error(`Timed out warming ${path}: ${String((lastError as any)?.message ?? lastError ?? 'unknown')}`)
  }

  // Ensure server is up.
  await waitFor('/api/health')

  await Promise.all([
    waitFor('/login'),
    waitFor('/'),
    waitFor('/book/e2e-warm'),
    waitFor('/vendor/schedule'),
    waitFor('/vendor/dashboard'),
    waitFor('/customer/dashboard'),
    (async () => {
      try {
        await fetch(`${warmupBaseURL}/api/bookings/create`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            providerId: 'warm',
            serviceId: 'warm',
            startTime: '2030-01-01T10:00:00Z',
            endTime: '2030-01-01T11:00:00Z',
            amountUSD: 1
          })
        })
      } catch {
        // Ignore; the goal is route compilation, not correctness.
      }
    })()
  ])
}
