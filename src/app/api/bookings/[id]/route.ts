import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await context.params
    const cfg = getSupabaseConfig()
    const admin = createClient(cfg.url, (cfg.secretKey || cfg.publishableKey) as string, { auth: { persistSession: false } })

    const { data, error } = await admin
      .from('bookings')
      .select('*')
      .eq('id', id)
      .maybeSingle()

    if (error || !data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }
    return NextResponse.json(data)
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Unknown error' }, { status: 500 })
  }
}



