import { NextRequest } from 'next/server';
import { supabase } from '@/lib/supabaseClient';
import { getAuthenticatedUserId } from '@/app/api/_utils/auth';
import '@/app/api/_utils/observability';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id, provider_id')
    .eq('id', params.id)
    .single();

  if (!booking || (booking.customer_id !== userId && booking.provider_id !== userId)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const limit = parseInt(request.nextUrl.searchParams.get('limit') ?? '50');
  const { data, error } = await supabase
    .from('booking_messages')
    .select('*')
    .eq('booking_id', params.id)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return Response.json({ messages: data || [] });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const userId = await getAuthenticatedUserId(request);
  if (!userId) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const text = body.body;
  if (!text) {
    return new Response(JSON.stringify({ error: 'Body required' }), { status: 400 });
  }

  const { data: booking } = await supabase
    .from('bookings')
    .select('customer_id, provider_id')
    .eq('id', params.id)
    .single();

  if (!booking || (booking.customer_id !== userId && booking.provider_id !== userId)) {
    return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
  }

  const sender_type = booking.customer_id === userId ? 'customer' : 'provider';

  const { data, error } = await supabase
    .from('booking_messages')
    .insert({
      booking_id: params.id,
      sender_id: userId,
      sender_type,
      body: text,
    })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 500 });
  }

  return new Response(JSON.stringify(data), { status: 201 });
}
