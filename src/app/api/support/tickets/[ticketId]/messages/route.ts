import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { z } from 'zod'

// GET /api/support/tickets/:ticketId/messages
export async function GET(req: NextRequest) {
  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
  const ticketId = new URL(req.url).pathname.split('/')[4]

  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id,message,sender_id,sender_type,is_internal,created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Error fetching ticket messages:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}

// POST /api/support/tickets/:ticketId/messages
const postSchema = z.object({
  message: z.string().min(1).max(5000),
  is_internal: z.boolean().optional().default(false),
  sender_id: z.string().uuid().optional(),
  sender_type: z.enum(['customer', 'agent', 'system']).default('agent')
})

export async function POST(req: NextRequest) {
  const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
  const ticketId = new URL(req.url).pathname.split('/')[4]

  try {
    const body = await req.json()
    const { message, is_internal, sender_id, sender_type } = postSchema.parse(body)

    const { data, error } = await supabase
      .from('support_messages')
      .insert({
        ticket_id: ticketId,
        message,
        is_internal,
        sender_id,
        sender_type
      })
      .select('id,message,sender_id,sender_type,is_internal,created_at')
      .single()

    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (error) {
    console.error('Error creating ticket message:', error);
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
} 