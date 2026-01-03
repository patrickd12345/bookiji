/**
 * Helper to check if Supabase is available for tests
 * Used to skip Supabase-dependent tests when Supabase is not running
 */

import { getSupabaseAdmin } from '../e2e/helpers/supabaseAdmin'

let availabilityCache: { available: boolean; checked: number } | null = null
const CACHE_TTL = 30_000 // 30 seconds

/**
 * Check if Supabase is available (with caching)
 */
export async function isSupabaseAvailable(): Promise<boolean> {
  // Check cache first
  if (availabilityCache && Date.now() - availabilityCache.checked < CACHE_TTL) {
    return availabilityCache.available
  }

  try {
    const supabase = getSupabaseAdmin()
    // Try a simple query to check connectivity
    const { error } = await supabase.from('profiles').select('id').limit(1)

    // Conservative: any error here means Supabase isn't usable for E2E role flows
    // (bad URL, bad key, connection refused, paused project, etc.).
    const available = !error
    availabilityCache = { available, checked: Date.now() }
    return available
  } catch (error) {
    // Connection timeout or other errors mean Supabase is not available
    availabilityCache = { available: false, checked: Date.now() }
    return false
  }
}

/**
 * Skip test if Supabase is not available
 * Use in test.beforeAll or test.beforeEach hooks
 */
export async function skipIfSupabaseUnavailable(testInfo: { skip: (condition: boolean, reason?: string) => void }) {
  const available = await isSupabaseAvailable()
  if (!available) {
    testInfo.skip(true, 'Supabase is not available. Start Docker Desktop and run `pnpm db:start`, or configure remote Supabase with `pnpm e2e:setup-remote`')
  }
}

/**
 * Get a helpful error message when Supabase is unavailable
 */
export function getSupabaseUnavailableMessage(): string {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || 'unknown'
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(supabaseUrl)
  
  if (isLocal) {
    return `Supabase is not available at ${supabaseUrl}.\n` +
      `\n` +
      `To fix:\n` +
      `  1. Start Docker Desktop\n` +
      `  2. Run: pnpm db:start\n` +
      `  3. Or: Use remote Supabase with pnpm e2e:setup-remote\n`
  } else {
    return `Cannot connect to remote Supabase at ${supabaseUrl}.\n` +
      `\n` +
      `To fix:\n` +
      `  1. Verify SUPABASE_URL is correct\n` +
      `  2. Check that project is active (not paused) in Supabase dashboard\n` +
      `  3. Verify SUPABASE_SECRET_KEY is set correctly\n` +
      `  4. Check network connectivity\n`
  }
}

