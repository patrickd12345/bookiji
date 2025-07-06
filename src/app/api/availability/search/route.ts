import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

// Free availability search: no payment intent required
export async function POST(req: NextRequest) {
  try {
    const { providerId, date } = await req.json()

    if (!providerId) {
      return NextResponse.json({ error: 'Missing providerId' }, { status: 400 })
    }

    // Fetch all open slots for the provider on or after the specified date
    const { data: slots, error } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time')
      .eq('provider_id', providerId)
      .eq('is_booked', false)
      .gte('start_time', date ? `${date}T00:00:00Z` : new Date().toISOString())
      .order('start_time')

    if (error) {
      console.error('Error fetching slots:', error)
      return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 })
    }

    return NextResponse.json({ success: true, slots: slots || [] })
  } catch (err) {
    console.error('availability search error:', err)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
} 