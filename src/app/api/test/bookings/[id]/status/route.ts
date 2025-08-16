import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Disabled in production' }, { status: 403 })
  }
  const { id: bookingId } = await params
  try {
    const body = await request.json().catch(() => ({}))
    const status = body?.status ?? 'confirmed'
    const cfg = getSupabaseConfig()
    const admin = createClient(cfg.url, (cfg.secretKey || cfg.publishableKey) as string, { auth: { persistSession: false } })
    const { error } = await admin.from('bookings').update({ status, updated_at: new Date().toISOString() }).eq('id', bookingId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}


