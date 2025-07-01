import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const profileId = searchParams.get('profileId')
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // Check if Google Calendar is connected
    const { data: connection, error } = await supabase
      .from('provider_calendars')
      .select('id, created_at, expiry_date, google_email, system_type')
      .eq('profile_id', profileId)
      .eq('system_type', 'google')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 is "no rows returned"
      console.error('Error checking Google Calendar status:', error)
      return NextResponse.json({ error: 'Failed to check connection status' }, { status: 500 })
    }

    const isConnected = !!connection
    const connectionInfo = connection ? {
      connectedAt: connection.created_at,
      expiresAt: connection.expiry_date,
      isExpired: new Date() > new Date(connection.expiry_date),
      googleEmail: connection.google_email
    } : null

    return NextResponse.json({ 
      success: true,
      isConnected,
      connectionInfo
    })

  } catch (error) {
    console.error('Google Calendar status check error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 