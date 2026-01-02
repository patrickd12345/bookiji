import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { google } from 'googleapis'
import { CalendarProvider } from '@/lib/calendar-adapters/types'
import { getSupabaseConfig } from '@/config/supabase'
import { isOAuthEnabled, isProviderAllowed } from '@/lib/calendar-sync/flags'
import { safeError } from '@/lib/calendar-sync/utils/token-redaction'

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/google/callback`
)

export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    
    // Get provider_id from query params
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')
    
    // Get code from query params (Google OAuth callback)
    const code = searchParams.get('code')
    if (!code) {
      return NextResponse.json(
        { error: 'Missing authorization code' },
        { status: 400 }
      )
    }
    
    // Check feature flag
    if (!isOAuthEnabled(providerId || undefined)) {
      return NextResponse.json(
        { error: 'Calendar OAuth is not enabled' },
        { status: 403 }
      )
    }
    
    // Check allowlist if provider_id is provided
    if (providerId && !isProviderAllowed(providerId)) {
      return NextResponse.json(
        { error: 'Provider not allowed for calendar OAuth' },
        { status: 403 }
      )
    }
    
    // Exchange code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    const { access_token, refresh_token, expiry_date } = tokens

    // Get user info from Google
    oauth2Client.setCredentials({ access_token })
    const oauth2 = google.oauth2('v2')
    const { data: userInfo } = await oauth2.userinfo.get({ auth: oauth2Client })

    const cookieStore = await cookies();
    const supabase = createServerClient(
      config.url,
      config.publishableKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options)
              })
            } catch (_error) {
              // The `setAll` method was called from a Server Component or Route Handler.
              // This can be ignored if you have middleware refreshing user sessions.
            }
          }
        },
      }
    );

    // Get authenticated user to determine provider_id
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Get provider_id from user's profile (provider_id is the profile id)
    const finalProviderId = providerId || user.id

    // Store in external_calendar_connections
    const { data: connection, error } = await supabase
      .from('external_calendar_connections')
      .insert({
        provider_id: finalProviderId,
        provider: CalendarProvider.GOOGLE,
        provider_user_id: userInfo.id,
        provider_email: userInfo.email,
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
      provider_email: userInfo.email
    })
  } catch (error) {
    safeError('Error in Google Calendar callback:', error)
    return NextResponse.json(
      { error: 'Failed to complete Google Calendar connection' },
      { status: 500 }
    )
  }
} 