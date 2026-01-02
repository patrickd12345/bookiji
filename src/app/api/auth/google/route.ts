import { google } from 'googleapis'
import { NextRequest, NextResponse } from 'next/server'
import { isOAuthEnabled } from '@/lib/calendar-sync/flags'

export async function GET(request: NextRequest) {
  // Check feature flag
  const { searchParams } = new URL(request.url)
  const providerId = searchParams.get('provider_id')
  
  if (!isOAuthEnabled(providerId || undefined)) {
    return NextResponse.json(
      { error: 'Calendar OAuth is not enabled' },
      { status: 403 }
    )
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  )

  const scopes = ['https://www.googleapis.com/auth/calendar.readonly']

  const url = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
  })

  return NextResponse.redirect(url)
} 