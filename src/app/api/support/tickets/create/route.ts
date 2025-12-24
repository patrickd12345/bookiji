import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'

export async function POST(req: NextRequest) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
  try {
    const { title, description, userId, categoryId } = await req.json()

    if (!title || !description || !userId) {
      return NextResponse.json({ ok: false, error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('support_tickets')
      .insert({
        title,
        description,
        user_id: userId,
        category_id: categoryId,
        status: 'open'
      })
      .select('id')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, ticketId: data.id })
  } catch (error) {
    console.error('Error creating support ticket:', error);
    return NextResponse.json(
      { error: 'Failed to create ticket' },
      { status: 500 }
    );
  }
} 