import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * AUTHORITATIVE PATH — Admin Settings Reset
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function POST(_request: NextRequest) {
  try {
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const dbSupabase = getServerSupabase()
    
    // Reset settings to defaults
    const { error } = await dbSupabase
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











