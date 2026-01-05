import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { getSupabaseConfig } from '@/config/supabase';

// Helper to format date in ICS format (YYYYMMDDTHHMMSSZ)
function formatICSDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const startStr = searchParams.get('start');
    const endStr = searchParams.get('end');
    const providerId = searchParams.get('providerId'); // Optional: restrict to specific provider if authorized

    // In a real scenario, we should authenticate the request,
    // but for ICS subscriptions (often public or token-protected URL),
    // we might accept a token in query param.
    // For now, let's assume valid session or public read for vendor's own calendar if token provided.

    // Simplification: We will just try to fetch bookings for the provider associated with the current user
    // or if providerId is given (and public availability is the goal).
    // Let's stick to the prompt: Export Bookiji calendar as an .ics file.

    // Calculate range
    const now = new Date();
    const start = startStr ? new Date(startStr) : new Date(now.getFullYear(), 0, 1);
    const end = endStr ? new Date(endStr) : new Date(now.getFullYear() + 1, 0, 1);

    // If no provider ID is specified, we need to know WHICH calendar to export.
    // Assuming this endpoint is hit by the vendor or system knowing the provider ID.
    // Let's require providerId or try to get it from auth (but this might be a feed URL).
    // If it's a feed URL, it usually has a unique token.
    // For this task, I'll rely on a query param `providerId`.

    const config = getSupabaseConfig();
    const cookieStore = await cookies();
    const supabase = createServerClient(
        config.url,
        config.publishableKey,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                     try {
                        cookiesToSet.forEach(({ name, value, options }) => {
                            cookieStore.set(name, value, options);
                        });
                    } catch {
                        // ignored
                    }
                },
            },
        }
    );

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    // Determine target provider ID
    let targetProviderId = providerId;

    // If no providerId specified, use current user's profile ID
    if (!targetProviderId) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('id')
            .eq('auth_user_id', user.id)
            .single();

        if (profile) {
            targetProviderId = profile.id;
        }
    }

    if (!targetProviderId) {
         return new NextResponse('Missing providerId', { status: 400 });
    }

    // Security check: Ensure the authenticated user owns this provider ID
    // (Or implement specific permission check if admins can export)
    const { data: ownerProfile } = await supabase
        .from('profiles')
        .select('auth_user_id')
        .eq('id', targetProviderId)
        .single();

    if (!ownerProfile || ownerProfile.auth_user_id !== user.id) {
         return new NextResponse('Forbidden', { status: 403 });
    }

    // Fetch bookings (Busy events)
    const { data: bookings, error: bookingsError } = await supabase
      .from('bookings')
      .select('id, start_time, end_time, service_id, status')
      .eq('provider_id', targetProviderId)
      .gte('start_time', start.toISOString())
      .lte('end_time', end.toISOString());

    if (bookingsError) throw bookingsError;

    // Fetch availability (Free events? Or just busy blocks?)
    // Usually ICS export for a provider shows when they are BUSY (bookings + blocks).
    // The prompt says: "Include: All availability slots (as free/busy events), All bookings (as busy events...)"
    // Availability slots usually mean "When I AM available".
    // Exporting "Free" time in ICS is TRANSPARENT events.

    const { data: slots, error: slotsError } = await supabase
      .from('availability_slots')
      .select('id, start_time, end_time, is_available')
      .eq('provider_id', targetProviderId)
      .gte('start_time', start.toISOString())
      .lte('end_time', end.toISOString());

    if (slotsError) throw slotsError;

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//Bookiji//Calendar Export//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
    ];

    // Add Bookings as BUSY
    bookings?.forEach(booking => {
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${booking.id}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(new Date(booking.start_time))}`,
        `DTEND:${formatICSDate(new Date(booking.end_time))}`,
        `SUMMARY:Bookiji Booking`, // Don't leak customer info
        'STATUS:CONFIRMED',
        'TRANSP:OPAQUE', // Opaque = Busy
        'END:VEVENT'
      );
    });

    // Add Slots
    // If is_available = true -> Free (Transparent)
    // If is_available = false -> Busy (Opaque) - e.g. a block
    slots?.forEach(slot => {
      icsContent.push(
        'BEGIN:VEVENT',
        `UID:${slot.id}`,
        `DTSTAMP:${formatICSDate(new Date())}`,
        `DTSTART:${formatICSDate(new Date(slot.start_time))}`,
        `DTEND:${formatICSDate(new Date(slot.end_time))}`,
        `SUMMARY:${slot.is_available ? 'Available' : 'Blocked'}`,
        'STATUS:CONFIRMED',
        `TRANSP:${slot.is_available ? 'TRANSPARENT' : 'OPAQUE'}`,
        'END:VEVENT'
      );
    });

    icsContent.push('END:VCALENDAR');

    return new NextResponse(icsContent.join('\r\n'), {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Content-Disposition': `attachment; filename="bookiji-calendar-${targetProviderId}.ics"`,
      },
    });

  } catch (error) {
    console.error('ICS Export Error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
