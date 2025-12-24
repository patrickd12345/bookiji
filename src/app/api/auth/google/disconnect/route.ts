import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { GoogleCalendarAdapterFactory } from '@/lib/calendar-adapters/google'
import type { CalendarSystemConfig, CalendarCredentials } from '@/lib/calendar-adapters/types'

export async function POST(request: NextRequest) {
  try {
    const { profileId } = await request.json()
    
    if (!profileId) {
      return NextResponse.json({ error: 'Profile ID is required' }, { status: 400 })
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>

    // Get the calendar connection details
    const { data: connection, error: fetchError } = await supabase
      .from('provider_calendars')
      .select('*')
      .eq('profile_id', profileId)
      .single()

    if (fetchError) {
      console.error('Error fetching calendar connection:', fetchError)
      return NextResponse.json({ error: 'Failed to fetch calendar connection' }, { status: 500 })
    }

    if (!connection) {
      return NextResponse.json({ error: 'No calendar connection found' }, { status: 404 })
    }

    // Get the calendar system config
    const { data: systemConfig, error: configError } = await supabase
      .from('external_calendar_systems')
      .select('*')
      .eq('type', connection.system_type)
      .single()

    if (configError) {
      console.error('Error fetching calendar system config:', configError)
      return NextResponse.json({ error: 'Failed to fetch calendar system config' }, { status: 500 })
    }

    // Create and use the calendar adapter
    const factory = new GoogleCalendarAdapterFactory()
    const adapter = factory.createAdapter(systemConfig as CalendarSystemConfig)

    // Connect with the existing credentials to perform the disconnect
    const credentials: CalendarCredentials = {
      access_token: connection.access_token,
      refresh_token: connection.refresh_token,
      token_expiry: new Date(connection.expiry_date),
      provider_email: connection.google_email,
      provider_user_id: connection.provider_user_id
    }

    await adapter.connect(credentials.access_token)
    await adapter.disconnect(connection.id)

    // Delete the calendar connection record
    const { error: deleteError } = await supabase
      .from('provider_calendars')
      .delete()
      .eq('profile_id', profileId)

    if (deleteError) {
      console.error('Error deleting calendar connection:', deleteError)
      return NextResponse.json({ error: 'Failed to delete calendar connection' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Calendar disconnected successfully' 
    })

  } catch (error) {
    console.error('Calendar disconnect error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
} 