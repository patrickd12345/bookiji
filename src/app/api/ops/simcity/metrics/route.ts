import { NextResponse } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export async function GET() {
  try {
    const { data, error } = await supabase.rpc('get_simcity_metrics')

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const metrics = data?.[0] || {
      bookings_created_count: 0,
      cancellations_count: 0,
      reschedules_count: 0,
      active_bookings_count: 0,
      slots_available_count: 0,
      slots_unavailable_count: 0
    }

    return NextResponse.json(metrics)
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 })
  }
}

