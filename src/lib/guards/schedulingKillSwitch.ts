/**
 * Scheduling Kill Switch
 * 
 * Server-enforced kill switch to block new booking confirmations instantly
 * without redeploy. Does not affect existing bookings, cancellations, or refunds.
 */

import { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/supabase'

type SupabaseAdmin = SupabaseClient<Database>

export class SchedulingDisabledError extends Error {
  statusCode = 503
  code = 'SCHEDULING_DISABLED'
  
  constructor() {
    super('Scheduling is temporarily unavailable. No bookings were taken.')
    this.name = 'SchedulingDisabledError'
  }
}

/**
 * Assert that scheduling is enabled
 * 
 * Throws SchedulingDisabledError (503) if scheduling is disabled
 * 
 * @param supabaseAdmin - Supabase admin client
 * @throws {SchedulingDisabledError} If scheduling is disabled
 */
export async function assertSchedulingEnabled(
  supabaseAdmin: SupabaseAdmin
): Promise<void> {
  const { data, error } = await supabaseAdmin
    .from('system_flags')
    .select('value')
    .eq('key', 'scheduling_enabled')
    .single()

  if (error) {
    // FAIL-OPEN DEFAULT: If flag doesn't exist or DB read fails, default to enabled.
    // This ensures a broken flag system never deadlocks the product.
    // Scenarios handled:
    // - Missing row → treated as enabled
    // - Transient DB read error → treated as enabled with log
    // - Connection timeout → treated as enabled with log
    // Only explicit false value disables scheduling.
    console.error('Error reading scheduling_enabled flag:', error)
    return // Fail open: allow scheduling to proceed
  }

  if (data && data.value === false) {
    throw new SchedulingDisabledError()
  }
  
  // If data exists and value is true (or null/undefined), allow scheduling
  // This covers: explicit true, missing value field, or any non-false value
}

