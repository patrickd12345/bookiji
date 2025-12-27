import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

/**
 * Reconciliation Job: Cancel Expired Holds
 * 
 * This endpoint cancels bookings in 'hold_placed' state that have expired
 * and releases their associated slots.
 * 
 * Should be called periodically (e.g., via Vercel Cron or similar)
 * 
 * Usage:
 *   GET /api/cron/cancel-expired-holds?secret=<CRON_SECRET>
 */
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET || process.env.VERCEL_CRON_SECRET
  const providedSecret = req.nextUrl.searchParams.get('secret')

  // Verify cron secret
  if (!cronSecret || providedSecret !== cronSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const config = getSupabaseConfig()
    if (!config.secretKey) {
      return NextResponse.json(
        { error: 'Database configuration error' },
        { status: 500 }
      )
    }

    const supabase = createClient(config.url, config.secretKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    // Call the database function to cancel expired holds
    const { data, error } = await supabase.rpc('cancel_expired_holds')

    if (error) {
      console.error('Error cancelling expired holds:', error)
      return NextResponse.json(
        { error: 'Failed to cancel expired holds', details: error.message },
        { status: 500 }
      )
    }

    const result = Array.isArray(data) && data.length > 0 ? data[0] : data

    return NextResponse.json({
      success: true,
      cancelled_count: result?.cancelled_count || 0,
      released_slots_count: result?.released_slots_count || 0,
      timestamp: new Date().toISOString()
    })

  } catch (error) {
    console.error('Unexpected error in cancel-expired-holds:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

