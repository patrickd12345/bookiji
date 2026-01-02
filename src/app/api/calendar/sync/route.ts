import { google } from 'googleapis'
import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { isCalendarSyncEnabled } from '@/lib/calendar-sync/flags'

export async function POST(request: Request) {
  // IMPORTANT: Do not create Supabase clients at module load.
  // Next.js can import route modules during `next build` ("Collecting page data"),
  // and env assertions inside Supabase client creation would fail the build.
  const supabase = createSupabaseServerClient()

  const { profileId } = await request.json()

  if (!profileId) {
    return NextResponse.json({ error: 'Missing profileId' }, { status: 400 })
  }

  // Check feature flag
  if (!isCalendarSyncEnabled(profileId)) {
    return NextResponse.json(
      { error: 'Calendar sync is not enabled' },
      { status: 403 }
    )
  }

  try {
    // 1. Fetch the stored credentials from the database
    const { data: credentials, error: credError } = await supabase
      .from('provider_google_calendar')
      .select('access_token, refresh_token, expiry_date')
      .eq('profile_id', profileId)
      .single()

    if (credError || !credentials) {
      console.error('Error fetching credentials:', credError)
      return NextResponse.json({ error: 'Could not find calendar credentials for this user.' }, { status: 404 })
    }

    // 2. Create an authenticated OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    )

    oauth2Client.setCredentials({
      access_token: credentials.access_token,
      refresh_token: credentials.refresh_token,
      expiry_date: new Date(credentials.expiry_date).getTime(),
    });

    // 3. Add a listener to save new tokens when they are refreshed
    oauth2Client.on('tokens', async (tokens) => {
      console.warn('Google tokens are being refreshed.');
      const updateData: { access_token: string, expiry_date: string, refresh_token?: string } = {
        access_token: tokens.access_token!,
        expiry_date: new Date(tokens.expiry_date!).toISOString(),
      };

      if (tokens.refresh_token) {
        console.warn('A new refresh token was provided.');
        updateData.refresh_token = tokens.refresh_token;
      }
      
      const { error } = await supabase
        .from('provider_google_calendar')
        .update(updateData)
        .eq('profile_id', profileId);

      if (error) {
        console.error('Failed to save refreshed tokens to database:', error);
      } else {
        console.warn('Successfully saved refreshed tokens.');
      }
    });

    // 4. Use the client to interact with the Google Calendar API
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    // First, find the user's primary calendar
    const calendarList = await calendar.calendarList.list();
    const primaryCalendar = calendarList.data.items?.find(cal => cal.primary);

    if (!primaryCalendar || !primaryCalendar.id) {
      return NextResponse.json({ error: 'Could not find a primary calendar.' }, { status: 404 });
    }

    // Now, query the free/busy information for the next 30 days
    const timeMin = new Date();
    const timeMax = new Date();
    timeMax.setDate(timeMin.getDate() + 30);

    const freeBusyResponse = await calendar.freebusy.query({
      requestBody: {
        timeMin: timeMin.toISOString(),
        timeMax: timeMax.toISOString(),
        items: [{ id: primaryCalendar.id }],
      },
    });

    const busySlots = freeBusyResponse.data.calendars?.[primaryCalendar.id]?.busy;

    return NextResponse.json({
      message: `Sync successful for ${primaryCalendar.id}`,
      busy: busySlots || [],
    });

  } catch (error) {
    console.error('Error syncing calendar:', error)
    return NextResponse.json({ error: 'Failed to sync calendar.' }, { status: 500 })
  }
} 