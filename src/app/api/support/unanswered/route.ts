import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

export async function POST(request: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
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
  } catch (error) {
    console.error('Error fetching unanswered tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch unanswered tickets' },
      { status: 500 }
    );
  }
} 