import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { z } from 'zod'

// GET /api/support/tickets/:ticketId/messages
export async function GET(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  const supabase = createSupabaseClient()
  const { ticketId } = params

  try {
    const { data, error } = await supabase
      .from('support_messages')
      .select('id,message,sender_id,sender_type,is_internal,created_at')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true })
      .limit(500)

    if (error) throw error

    return NextResponse.json({ ok: true, data })
  } catch (err: any) {
    console.error('[support/messages] GET error', err)
    return NextResponse.json({ ok: false, error: err.message }, { status: 500 })
  }
}

// POST /api/support/tickets/:ticketId/messages
const postSchema = z.object({
  message: z.string().min(1).max(5000),
  is_internal: z.boolean().optional().default(false),
  sender_id: z.string().uuid().optional(),
  sender_type: z.enum(['customer', 'agent', 'system']).default('agent')
})

export async function POST(
  req: NextRequest,
  { params }: { params: { ticketId: string } }
) {
  const supabase = createSupabaseClient()
  const { ticketId } = params

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
  } catch (err: any) {
    const msg = err?.issues ? err.issues.map((i: any) => i.message).join(', ') : err.message
    console.error('[support/messages] POST error', err)
    return NextResponse.json({ ok: false, error: msg }, { status: 400 })
  }
} 