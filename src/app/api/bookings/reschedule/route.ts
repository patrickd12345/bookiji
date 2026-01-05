
import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseConfig } from '@/config/supabase'
import { syncBookingUpdatedToCalendar } from '@/lib/calendar-sync/outbound/sync-booking-updated'
import { GoogleCalendarAdapterFactory } from '@/lib/calendar-adapters/google'
import { MicrosoftCalendarAdapterFactory } from '@/lib/calendar-adapters/microsoft'
import { CalendarSystemConfig, CalendarAdapter } from '@/lib/calendar-adapters/types'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { bookingId, newSlotStart, newSlotEnd, new_slot_id } = body

    // Support both ID based (new_slot_id) and time based (start/end) inputs if needed,
    // but RPC uses slot_id. The frontend seems to send newSlotStart/End but maybe not slot_id?
    // Let's check `ResilientRescheduleButton` usage. It sends: `rescheduleDetails` which has `bookingId`, `newSlotStart`, `newSlotEnd`.
    // It does NOT send `new_slot_id`.
    // BUT the prompt recommendation for the route says: `const { new_slot_id } = body`.
    // And calls `reschedule_booking_atomically` with `p_new_slot_id`.

    // So we need to find the slot ID from start/end if not provided, OR the frontend needs to send it.
    // Given I cannot easily change the frontend `ResilientRescheduleButton` (it's a component, used somewhere),
    // I should check if I can look up the slot ID.

    // Let's assume for now we need to lookup the slot ID based on time and provider.
    // Wait, `ResilientRescheduleButton` props are passed in. The component usage determines what is passed.
    // If the frontend is calling this, it implies we might need to find the slot.

    // However, to be safe and following the prompt "Create src/app/api/bookings/[id]/reschedule/route.ts" recommendation which uses `new_slot_id`:
    // I should probably stick to `new_slot_id` being passed.
    // If `ResilientRescheduleButton` is sending `newSlotStart` etc, maybe I should adapt.

    // Let's look at `ResilientRescheduleButton.tsx` again.
    // `body: JSON.stringify(rescheduleDetails)` where `rescheduleDetails` has `bookingId`, `newSlotStart`, `newSlotEnd`.
    // It DOES NOT have `new_slot_id`.

    // So if I implement the route expecting `new_slot_id`, it will fail for the existing frontend component.
    // I should try to find the slot based on start/end time.

    const config = getSupabaseConfig()
    const cookieStore = await cookies()
    const supabase = createServerClient(config.url, config.secretKey, {
        cookies: {
            getAll() { return cookieStore.getAll() },
            setAll(cookiesToSet) {
                 try {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        cookieStore.set(name, value, options)
                    })
                } catch {}
            }
        }
    })

    // Authenticate
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get booking
    const { data: booking, error: bookingError } = await supabase
      .from('bookings')
      .select('id, provider_id, customer_id, start_time, end_time, status')
      .eq('id', bookingId)
      .single()

    if (bookingError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    // Verify ownership
    const isCustomer = booking.customer_id === user.id
    const isVendor = booking.provider_id === user.id // using user.id as provider_id for simplicity, assuming profiles linked

    // We should probably check profiles for vendor match if `provider_id` is a profile ID (UUID) and user.id is Auth ID (UUID).
    // Usually they are different or mapped.
    // Let's check if the user is the customer or if their profile is the provider.

    let isAuthorized = isCustomer;
    if (!isAuthorized) {
        const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single();
        if (profile && profile.id === booking.provider_id) {
            isAuthorized = true;
        }
    }

    if (!isAuthorized) {
       return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    let targetSlotId = new_slot_id;

    if (!targetSlotId && newSlotStart && newSlotEnd) {
        // Find slot
        const { data: slot } = await supabase
            .from('availability_slots')
            .select('id')
            .eq('provider_id', booking.provider_id)
            .eq('start_time', newSlotStart)
            .eq('end_time', newSlotEnd)
            .single();

        if (slot) {
            targetSlotId = slot.id;
        }
    }

    if (!targetSlotId) {
        return NextResponse.json({ error: 'Target slot not found or new_slot_id missing' }, { status: 400 })
    }

    // Call RPC
    const { data: result, error: rpcError } = await supabase.rpc(
      'reschedule_booking_atomically',
      {
        p_booking_id: bookingId,
        p_new_slot_id: targetSlotId,
      }
    )

    if (rpcError) {
      console.error('Reschedule RPC error:', rpcError)
      return NextResponse.json({ error: 'Failed to reschedule booking' }, { status: 500 })
    }

    const rescheduleResult = Array.isArray(result) ? result[0] : result
    if (!rescheduleResult || !rescheduleResult.success) {
      return NextResponse.json(
        { error: rescheduleResult?.error_message || 'Failed to reschedule booking' },
        { status: 400 }
      )
    }

    // Sync to calendar
    // Fire and forget
    (async () => {
        try {
             // We need to pass the adapter to syncBookingUpdatedToCalendar
             // But wait, syncBookingUpdatedToCalendar logic I read earlier takes `adapter` as an argument.
             // This means the route needs to instantiate the adapter.

             // 1. Get connections
             const { data: connections } = await supabase
                .from('external_calendar_connections')
                .select('*')
                .eq('provider_id', booking.provider_id)
                .eq('sync_enabled', true);

             if (connections) {
                 for (const conn of connections) {
                     const adapterConfig: CalendarSystemConfig = {
                        id: conn.id,
                        name: conn.provider,
                        type: (conn.provider === 'google' ? 'google' : conn.provider === 'microsoft' ? 'outlook' : 'custom') as 'google' | 'outlook' | 'ical' | 'exchange' | 'custom',
                        authType: 'oauth2'
                    };

                    let adapter: CalendarAdapter | undefined;
                    if (conn.provider === 'google') {
                        const factory = new GoogleCalendarAdapterFactory();
                        adapter = factory.createAdapter(adapterConfig);
                        if (adapter.setCredentials) {
                            adapter.setCredentials({
                                access_token: conn.access_token,
                                refresh_token: conn.refresh_token,
                                token_expiry: new Date(conn.token_expiry)
                            });
                        }
                    } else if (conn.provider === 'microsoft') {
                        const factory = new MicrosoftCalendarAdapterFactory();
                        adapter = factory.createAdapter(adapterConfig);
                    }

                    if (adapter) {
                        await syncBookingUpdatedToCalendar({
                            booking_id: bookingId,
                            provider_id: booking.provider_id,
                            calendar_provider: conn.provider,
                            adapter
                        });
                    }
                 }
             }
        } catch (e) {
            console.error('Sync error during reschedule:', e)
        }
    })();

    return NextResponse.json({
        success: true,
        rescheduleId: bookingId, // The frontend expects rescheduleId
        message: 'Reschedule successful'
    })

  } catch (error) {
    console.error('Reschedule error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
