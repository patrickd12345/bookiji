import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function GET(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerSupabase()
    
    // Get settings from database (or return defaults)
    const { data, error } = await supabase
      .from('admin_settings')
      .select('*')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Settings fetch error:', error)
    }

    const settings = data || {
      twoFactorAuth: false,
      loginNotifications: true,
      maintenanceMode: false,
      autoBackup: true,
      errorLogging: true,
      sessionTimeout: '1 hour'
    }

    return NextResponse.json({ success: true, settings })
  } catch (error) {
    console.error('Settings error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()
    const supabase = getServerSupabase()
    
    // Upsert settings
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        id: 1,
        ...updates,
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      console.error('Settings update error:', error)
      return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 })
    }

    return NextResponse.json({ success: true, message: 'Settings updated' })
  } catch (error) {
    console.error('Settings update error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
