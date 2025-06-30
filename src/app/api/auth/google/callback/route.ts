import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    const error = searchParams.get('error')
    const state = searchParams.get('state') // Optional: for CSRF protection

    if (error) {
      console.error('OAuth error:', error)
      return NextResponse.redirect(new URL('/vendor/schedule?error=oauth_error', request.url))
    }

    if (!code) {
      return NextResponse.redirect(new URL('/vendor/schedule?error=no_code', request.url))
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    )

    // Exchange authorization code for tokens
    const { tokens } = await oauth2Client.getToken(code)
    
    if (!tokens.access_token) {
      throw new Error('No access token received')
    }

    // TODO: Get the actual user profile ID from the session
    // For now, using the hardcoded email approach like in the schedule page
    const supabase = createSupabaseClient()
    
    // Get the provider profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('email', 'pilotmontreal@gmail.com') // Replace with actual session logic
      .single()

    if (profileError || !profile) {
      console.error('Error fetching provider profile:', profileError)
      return NextResponse.redirect(new URL('/vendor/schedule?error=profile_not_found', request.url))
    }

    // Store the tokens in the database
    const { error: insertError } = await supabase
      .from('provider_google_calendar')
      .upsert({
        profile_id: profile.id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expiry_date: tokens.expiry_date ? new Date(tokens.expiry_date).toISOString() : new Date(Date.now() + 3600000).toISOString() // Default to 1 hour if no expiry
      })

    if (insertError) {
      console.error('Error storing Google Calendar tokens:', insertError)
      return NextResponse.redirect(new URL('/vendor/schedule?error=storage_error', request.url))
    }

    // Redirect back to the schedule page with success
    return NextResponse.redirect(new URL('/vendor/schedule?success=calendar_connected', request.url))

  } catch (error) {
    console.error('Google Calendar callback error:', error)
    return NextResponse.redirect(new URL('/vendor/schedule?error=callback_error', request.url))
  }
} 