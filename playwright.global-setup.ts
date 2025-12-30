import { execSync } from 'node:child_process'

export default async function globalSetup() {
  // Ensure deterministic Supabase Auth users exist for E2E runs.
  // Skip if E2E_SKIP_SEED is set (useful for cloud environments where users may already exist)
  if (process.env.E2E_SKIP_SEED !== 'true') {
    try {
      execSync('pnpm e2e:seed', { stdio: 'inherit' })
    } catch (error: any) {
      // If seeding fails, check if it's a connection error
      const output = error.stdout?.toString() || error.stderr?.toString() || error.message || ''
      if (output.includes('ECONNREFUSED') || 
          output.includes('fetch failed') || 
          output.includes('Cannot connect') ||
          output.includes('Connection timeout') ||
          output.includes('timeout') ||
          output.includes('UND_ERR_HEADERS_TIMEOUT')) {
        console.error('\n❌ User seeding failed - Supabase is not reachable')
        console.error('\n💡 Options:')
        console.error('  1. Set up remote Supabase: pnpm e2e:setup-remote')
        console.error('  2. Skip seeding (if users already exist): E2E_SKIP_SEED=true pnpm e2e')
        console.error('  3. Start local Supabase: pnpm db:start (requires Docker)')
        console.error('\n📖 See docs/testing/CLOUD_E2E_SETUP.md for details\n')
        
        // In cloud environments, allow continuing if skip flag would work
        const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
        const isRemote = supabaseUrl && !/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(supabaseUrl)
        
        if (isRemote || process.env.CI || process.env.CURSOR || process.env.CODEX) {
          console.error('⚠️  Continuing without seeded users - tests may fail if they require specific users')
          console.error('   Set E2E_SKIP_SEED=true to suppress this warning\n')
        } else {
          throw error
        }
      } else {
        throw error
      }
    }
  } else {
    console.log('⏭️  Skipping user seeding (E2E_SKIP_SEED=true)')
  }

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
