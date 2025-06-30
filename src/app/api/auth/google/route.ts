import { google } from 'googleapis'
import { NextResponse } from 'next/server'

export async function GET() {
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