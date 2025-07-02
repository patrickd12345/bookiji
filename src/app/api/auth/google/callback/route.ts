import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { google } from 'googleapis'
import { CalendarProvider } from '@/lib/calendar-adapters/types'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${process.env.NEXT_PUBLIC_APP_URL}/api/auth/google/callback`
)

export async function POST(request: Request) {
  try {
    const { code, email } = await request.json()
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    const { access_token, refresh_token, expiry_date } = tokens

    // Get user info from Google
    oauth2Client.setCredentials({ access_token })
    const oauth2 = google.oauth2('v2')
    const { data: userInfo } = await oauth2.userinfo.get({ auth: oauth2Client })

    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    // Store in external_calendar_connections
    const { data: connection, error } = await supabase
      .from('external_calendar_connections')
      .insert({
        provider: CalendarProvider.GOOGLE,
        provider_user_id: userInfo.id,
        provider_email: email || userInfo.email,
        provider_calendar_id: 'primary', // We'll update this after getting calendar list
        access_token,
        refresh_token,
        token_expiry: new Date(expiry_date!),
        sync_enabled: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      connection_id: connection.id,
      provider_email: email || userInfo.email
    })
  } catch (error) {
    console.error('Error in Google Calendar callback:', error)
    return NextResponse.json(
      { error: 'Failed to complete Google Calendar connection' },
      { status: 500 }
    )
  }
} 