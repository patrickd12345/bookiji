import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: NextRequest) {
  try {
    // Verify cron secret if provided
    const authHeader = request.headers.get('authorization')
    if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { url, secretKey } = getSupabaseConfig()
    if (!secretKey) {
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 })
    }

    const admin = createClient(url, secretKey, { auth: { persistSession: false } })

    // Call the cleanup function
    const { data: restoredCount, error } = await admin.rpc('cleanup_expired_reschedule_holds')

    if (error) {
      console.error('Cleanup error:', error)
      return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      restoredBookings: restoredCount,
      message: `Restored ${restoredCount} expired reschedule holds`
    })

  } catch (error) {
    console.error('Cron cleanup error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
