import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  const supabase = createSupabaseClient()
  const { query_text, source = 'faq', context = {} } = await request.json()

  if (!query_text) {
    return NextResponse.json({ ok: false, error: 'query_text required' }, { status: 400 })
  }
  try {
    const { error } = await supabase.from('support_unanswered_questions').insert([
      {
        query_text,
        source,
        query_context: context
      }
    ])
    if (error) throw error
    return NextResponse.json({ ok: true })
  } catch (err: any) {
    console.error('[support/unanswered] error', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
} 