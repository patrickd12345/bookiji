import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getServerSupabase()
    
    // Reset settings to defaults
    const { error } = await supabase
      .from('admin_settings')
      .upsert({
        id: 1,
        twoFactorAuth: false,
        loginNotifications: true,
        maintenanceMode: false,
        autoBackup: true,
        errorLogging: true,
        sessionTimeout: '1 hour',
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

    if (error) {
      console.error('Reset error:', error)
      return NextResponse.json({ error: 'Failed to reset settings' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Platform reset to factory defaults' 
    })
  } catch (error) {
    console.error('Reset error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










