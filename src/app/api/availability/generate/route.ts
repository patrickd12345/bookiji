import { NextRequest, NextResponse } from 'next/server';
import { getServerSupabase } from '@/lib/supabaseServer';
import { assertVendorHasActiveSubscription, SubscriptionRequiredError } from '@/lib/guards/subscriptionGuard';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { google } from 'googleapis';

interface ProviderSchedule {
  profile_id: string
  day_of_week: number
  start_time: string
  end_time: string
}

interface AvailabilitySlot {
  provider_id: string
  start_time: string
  end_time: string
  status: 'available' | 'booked' | 'blocked'
}

interface GoogleCalendarBusySlot {
  start: string
  end: string
}

// This function will be the core of our availability generation.
// For now, it's a placeholder.
async function generateAvailability(providerId: string) {
    console.log(`Generating availability for provider: ${providerId}`);

    // 1. Fetch Provider's Schedule Template from our DB
    const { data: schedule, error: scheduleError } = await supabase
        .from('provider_schedules')
        .select('*')
        .eq('profile_id', providerId);

    if (scheduleError) {
        throw new Error(`Failed to fetch schedule: ${scheduleError.message}`);
    }

    if (!schedule || schedule.length === 0) {
        console.log('Provider has no schedule set. Skipping.');
        return { message: 'Provider has no schedule template.' };
    }

    // 2. Fetch Provider's Google Calendar Tokens from our DB
    const { data: tokenData, error: tokenError } = await supabase
        .from('provider_google_calendar')
        .select('access_token, refresh_token')
        .eq('profile_id', providerId)
        .single();

    if (tokenError || !tokenData) {
        throw new Error('Provider has not connected their Google Calendar.');
    }
    
    // 3. Use tokens to fetch busy times from Google Calendar API
    const oauth2Client = new google.auth.OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.GOOGLE_REDIRECT_URI
    );

    oauth2Client.setCredentials({
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // Define the time range for the next 30 days
    const timeMin = new Date().toISOString();
    const timeMax = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const freeBusyResponse = await calendar.freebusy.query({
        requestBody: {
            timeMin,
            timeMax,
            items: [{ id: 'primary' }],
        },
    });

    const busySlots = (freeBusyResponse.data.calendars?.primary.busy || []) as GoogleCalendarBusySlot[];
    
    console.log('Fetched schedule:', schedule);
    console.log('Fetched busy slots from Google:', busySlots);

    // 4. Implement the logic to "subtract" busy times from the schedule template.
    const serviceDurationMinutes = 60; // Hardcoded for now
    const finalSlots: AvailabilitySlot[] = [];
    const today = new Date();

    for (let i = 0; i < 30; i++) { // Generate for the next 30 days
        const currentDate = new Date(today);
        currentDate.setDate(today.getDate() + i);
        currentDate.setHours(0, 0, 0, 0);

        const dayOfWeek = currentDate.getDay();
        const scheduleForDay = (schedule as ProviderSchedule[]).filter(s => s.day_of_week === dayOfWeek);
        if (scheduleForDay.length === 0) continue; // Not working on this day

        for (const block of scheduleForDay) {
            const startHour = parseInt(block.start_time.split(':')[0]);
            const startMinute = parseInt(block.start_time.split(':')[1]);
            const endHour = parseInt(block.end_time.split(':')[0]);
            const endMinute = parseInt(block.end_time.split(':')[1]);

            const slotStart = new Date(currentDate);
            slotStart.setHours(startHour, startMinute);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotStart.getMinutes() + serviceDurationMinutes);

            while(slotEnd.getHours() < endHour || (slotEnd.getHours() === endHour && slotEnd.getMinutes() <= endMinute)) {
                // Check for conflicts with Google Calendar busy slots
                const isOverlapping = busySlots.some(busy => {
                    const busyStart = new Date(busy.start);
                    const busyEnd = new Date(busy.end);
                    // Check if the potential slot is contained within a busy slot
                    return (slotStart < busyEnd && slotEnd > busyStart);
                });

                if (!isOverlapping) {
                    finalSlots.push({
                        provider_id: providerId,
                        start_time: new Date(slotStart.getTime() - (slotStart.getTimezoneOffset() * 60000)).toISOString(),
                        end_time: new Date(slotEnd.getTime() - (slotEnd.getTimezoneOffset() * 60000)).toISOString(),
                        status: 'available',
                    });
                }

                // Move to the next slot
                slotStart.setMinutes(slotStart.getMinutes() + serviceDurationMinutes);
                slotEnd.setMinutes(slotEnd.getMinutes() + serviceDurationMinutes);
            }
        }
    }

    // 5. Save the final, bookable slots into the `availability_slots` table.
    
    // First, delete all future availability for this provider to avoid duplicates.
    const { error: deleteError } = await supabase
        .from('availability_slots')
        .delete()
        .eq('provider_id', providerId)
        .gte('start_time', new Date().toISOString());

    if (deleteError) {
        throw new Error(`Failed to delete old slots: ${deleteError.message}`);
    }

    // Then, insert the new slots.
    if (finalSlots.length > 0) {
        const { error: insertError } = await supabase
            .from('availability_slots')
            .insert(finalSlots);
        
        if (insertError) {
            throw new Error(`Failed to insert new slots: ${insertError.message}`);
        }
    }

    return { message: `Successfully generated ${finalSlots.length} slots.`, finalSlots };
}


export async function POST(req: NextRequest) {
    try {
        // Be resilient in dev/e2e: tolerate empty/malformed bodies
        let providerId: string | undefined
        try {
            const body = await req.text()
            if (body) {
                const parsed = JSON.parse(body)
                providerId = parsed?.providerId
            }
        } catch {}

        // In non-production (dev/tests/e2e), return a stub instead of hitting external services
        if (process.env.NODE_ENV !== 'production' || process.env.E2E === '1') {
            return NextResponse.json({ message: 'Stubbed availability generation (dev/e2e)', finalSlots: [] })
        }

        if (!providerId) {
            return NextResponse.json({ error: 'Missing providerId' }, { status: 400 });
        }

        // Invariant III-1: Server-side subscription gating
        try {
            await assertVendorHasActiveSubscription(providerId);
        } catch (error) {
            if (error instanceof SubscriptionRequiredError) {
                return NextResponse.json(
                    { error: error.message },
                    { status: 403 }
                );
            }
            throw error;
        }

        const result = await generateAvailability(providerId);

        return NextResponse.json(result);
    } catch (error) {
        console.error('Error in /api/availability/generate:', error);
        return NextResponse.json({ 
            error: error instanceof Error ? error.message : 'Internal Server Error' 
        }, { status: 500 });
    }
} 