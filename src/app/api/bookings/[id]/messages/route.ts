import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabaseClient'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'
import '@/app/api/_utils/observability'

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } })
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return json({ error: 'Unauthorized' }, 401)

  const { id } = await params
  const { data: booking, error: berr } = await supabase
    .from('bookings')
    .select('customer_id,provider_id')
    .eq('id', id)
    .single()

  if (berr || !booking) return json({ error: 'Booking not found' }, 404)
  if (![booking.customer_id, booking.provider_id].includes(userId)) return json({ error: 'Forbidden' }, 403)

  const url = new URL(request.url)
  const limit = Math.max(1, Math.min(100, Number(url.searchParams.get('limit') || 50)))
  const before = url.searchParams.get('before')

  let q = supabase
    .from('booking_messages')
    .select('*')
    .eq('booking_id', id)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (before) q = q.lt('created_at', before)

  const { data, error } = await q
  if (error) return json({ error: error.message }, 500)
  return json({ messages: data ?? [] })
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const userId = await getAuthenticatedUserId(request)
  if (!userId) return json({ error: 'Unauthorized' }, 401)
  const body = await request.json().catch(() => ({}))
  const text = (body?.body ?? '').trim()
  if (!text) return json({ error: 'Body required' }, 400)

  const { id } = await params
  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id,provider_id')
    .eq('id', id)
    .single()

  if (!booking) return json({ error: 'Booking not found' }, 404)
  const sender_type = booking.customer_id === userId ? 'customer' : booking.provider_id === userId ? 'provider' : null
  if (!sender_type) return json({ error: 'Forbidden' }, 403)

  const { data, error } = await supabase.from('booking_messages').insert({
    booking_id: id,
    sender_id: userId,
    sender_type,
    body: text,
  }).select('*').single()

  if (error) return json({ error: error.message }, 500)
  return json({ message: data }, 201)
}
