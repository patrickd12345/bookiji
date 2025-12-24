import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

export async function GET(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status') || 'open'
  const userId = searchParams.get('userId')

  try {
    let q = supabase
      .from('support_tickets')
      .select('id,title,description,status,created_at,user_id')
      .order('created_at', { ascending: false })
      .limit(50)

    if (status !== 'all') {
      q = q.eq('status', status)
    }

    if (userId) {
      q = q.eq('user_id', userId)
    }

    const { data, error } = await q
    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Error fetching support tickets:', error);
    return NextResponse.json(
      { error: 'Failed to fetch tickets' },
      { status: 500 }
    );
  }
} 