import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(
  request: Request,
  context: { params: Promise<Record<string, string>> }
) {
  const { id: bookingId } = await context.params
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }

  try {
    const body = await request.json().catch(() => ({}))
    const slotStart = body?.slot_start as string | undefined
    const slotEnd = body?.slot_end as string | undefined

    if (!slotStart || !slotEnd) {
      return NextResponse.json({ error: 'slot_start and slot_end are required' }, { status: 400 })
    }

    const cfg = getSupabaseConfig()
    const admin = createClient(cfg.url, (cfg.secretKey || cfg.publishableKey) as string, { auth: { persistSession: false } })
    const { error } = await admin
      .from('bookings')
      .update({ slot_start: slotStart, slot_end: slotEnd, updated_at: new Date().toISOString() })
      .eq('id', bookingId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}
