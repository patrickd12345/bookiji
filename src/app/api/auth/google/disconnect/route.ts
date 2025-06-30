import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    const supabase = createSupabaseClient()

    // Delete the Google Calendar integration record
    const { error } = await supabase
      .from('provider_google_calendar')
      .delete()
      .eq('profile_id', profileId)

    if (error) {
      console.error('Error disconnecting Google Calendar:', error)
      return NextResponse.json({ error: 'Failed to disconnect Google Calendar' }, { status: 500 })
    }

    // Optionally, you could also revoke the token with Google
    // This would require making a request to Google's revoke endpoint
    // For now, we'll just remove it from our database

    return NextResponse.json({ 
      success: true, 
      message: 'Google Calendar disconnected successfully' 
    })

  } catch (error) {
    console.error('Google Calendar disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 