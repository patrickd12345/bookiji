import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'
import { CalendarProvider } from '@/lib/calendar-adapters/types'
import { getSupabaseConfig } from '@/config/supabase'
import { isOAuthEnabled, isProviderAllowed } from '@/lib/calendar-sync/flags'
import { safeError } from '@/lib/calendar-sync/utils/token-redaction'

// Microsoft Graph API endpoints
const TOKEN_ENDPOINT = 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
const USER_INFO_ENDPOINT = 'https://graph.microsoft.com/v1.0/me';

export async function GET(request: NextRequest) {
  try {
    const config = getSupabaseConfig()

    // Get provider_id from query params
    const { searchParams } = new URL(request.url)
    const providerId = searchParams.get('provider_id')

    // Get code from query params
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
    const tokenResponse = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
            client_id: process.env.MICROSOFT_CLIENT_ID || '',
            client_secret: process.env.MICROSOFT_CLIENT_SECRET || '',
            code,
            redirect_uri: process.env.MICROSOFT_REDIRECT_URI || `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/auth/microsoft/callback`,
            grant_type: 'authorization_code',
        }),
    });

    if (!tokenResponse.ok) {
        const errorText = await tokenResponse.text();
        throw new Error(`Failed to exchange code: ${errorText}`);
    }

    const tokens = await tokenResponse.json();
    const { access_token, refresh_token, expires_in } = tokens;
    const expiry_date = Date.now() + expires_in * 1000;

    // Get user info from Microsoft Graph
    const userResponse = await fetch(USER_INFO_ENDPOINT, {
        headers: {
            Authorization: `Bearer ${access_token}`,
        },
    });

    if (!userResponse.ok) {
        throw new Error('Failed to fetch user info');
    }

    const userInfo = await userResponse.json();

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
    let finalProviderId = providerId

    if (!finalProviderId) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('id')
        .eq('auth_user_id', user.id)
        .single()

      finalProviderId = profile?.id
    }

    if (!finalProviderId) {
      return NextResponse.json(
        { error: 'Profile not found' },
        { status: 404 }
      )
    }

    // Store in external_calendar_connections
    const { data: connection, error } = await supabase
      .from('external_calendar_connections')
      .insert({
        provider_id: finalProviderId,
        provider: CalendarProvider.MICROSOFT,
        provider_user_id: userInfo.id,
        provider_email: userInfo.mail || userInfo.userPrincipalName,
        provider_calendar_id: 'primary', // Default to primary
        access_token,
        refresh_token,
        token_expiry: new Date(expiry_date),
        sync_enabled: true
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({
      success: true,
      connection_id: connection.id,
      provider_email: userInfo.mail || userInfo.userPrincipalName
    })
  } catch (error) {
    safeError('Error in Microsoft Calendar callback:', error)
    return NextResponse.json(
      { error: 'Failed to complete Microsoft Calendar connection' },
      { status: 500 }
    )
  }
}
