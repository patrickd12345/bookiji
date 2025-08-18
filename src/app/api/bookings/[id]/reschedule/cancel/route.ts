import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const userId = await getAuthenticatedUserId(request)
    if (!userId) return NextResponse.json({ error: 'UNAUTHORIZED' }, { status: 401 })

    const { url, secretKey } = getSupabaseConfig()
    const admin = createClient(url, secretKey!, { auth: { persistSession: false } })

    const { data: booking, error } = await admin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .eq('customer_id', userId)
      .maybeSingle()

    if (error || !booking) return NextResponse.json({ error: 'NOT_FOUND' }, { status: 404 })
    if (!booking.reschedule_in_progress) return NextResponse.json({ error: 'INVALID_STATE' }, { status: 409 })

    const { error: updErr } = await admin
      .from('bookings')
      .update({ reschedule_in_progress: false, reschedule_hold_expires_at: null })
      .eq('id', id)

    if (updErr) return NextResponse.json({ error: 'UPDATE_FAILED' }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Reschedule cancel error:', error)
    return NextResponse.json({ error: 'INTERNAL' }, { status: 500 })
  }
}


