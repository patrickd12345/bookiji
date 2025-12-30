import { execSync } from 'node:child_process'

export default async function globalSetup() {
  // Ensure deterministic Supabase Auth users exist for E2E runs.
  execSync('pnpm e2e:seed', { stdio: 'inherit' })

  // Warm Next.js routes to avoid first-hit compile delays causing E2E flake.
  const baseURL = process.env.BASE_URL || process.env.E2E_BASE_URL || 'http://localhost:3000'

  const waitFor = async (path: string, timeoutMs = 120_000) => {
    const started = Date.now()
    let lastError: unknown = null
    while (Date.now() - started < timeoutMs) {
      try {
        const res = await fetch(`${baseURL}${path}`, { redirect: 'manual' as any })
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
        await fetch(`${baseURL}/api/bookings/create`, {
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
