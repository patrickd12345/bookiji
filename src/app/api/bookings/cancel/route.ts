// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextRequest, NextResponse } from 'next/server';
import { syncBookingCancelledToCalendar } from '@/lib/calendar-sync/outbound/sync-booking-cancelled';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

type CancelRequest = { quote_id: string };

function ok(data: unknown) { return NextResponse.json({ ok: true, data }); }
function err(code: string, message: string, details?: unknown, status = 400) {
  const correlation_id = (global as { __reqId?: string }).__reqId ?? 'dev';
  return NextResponse.json({ ok: false, code, message, details, correlation_id }, { status });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as CancelRequest;
    if (!body?.quote_id) return err('VALIDATION_ERROR', 'quote_id is required');
    // TODO: execute domain cancel + refund if needed

    // NOTE: This seems to be a skeleton/mock route.
    // Assuming we need to find the booking associated with the quote_id or if quote_id is actually booking_id in this context.
    // The previous implementation was just return ok({ cancelled: true });
    // I will add the sync call logic here but verify if I can get the booking ID.

    const config = getSupabaseConfig();
    const supabase = createClient(config.url, config.secretKey);

    // Try to find booking by quote_id
    const { data: booking } = await supabase
        .from('bookings')
        .select('id, provider_id')
        .eq('quote_id', body.quote_id)
        .single();

    if (booking) {
        // Fire and forget sync
        (async () => {
            try {
                await syncBookingCancelledToCalendar({
                    bookingId: booking.id,
                    providerId: booking.provider_id
                });
            } catch (error) {
                console.error('Failed to sync booking cancellation:', error);
            }
        })();
    }

    return ok({ cancelled: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Unknown error';
    return err('INTERNAL_ERROR', message, undefined, 500);
  }
}

