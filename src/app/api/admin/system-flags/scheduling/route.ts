import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'
import { supabaseAdmin } from '@/lib/supabaseProxies'

interface ToggleSchedulingRequest {
  enabled: boolean
  reason: string
}

/**
 * POST /api/admin/system-flags/scheduling
 * 
 * Toggle scheduling kill switch
 * 
 * Requires admin authentication
 * Requires reason (min 10 characters)
 */
export async function POST(req: NextRequest) {
  try {
    // Get admin user
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body: ToggleSchedulingRequest = await req.json()
    
    if (typeof body.enabled !== 'boolean') {
      return NextResponse.json(
        { error: 'enabled must be a boolean' },
        { status: 400 }
      )
    }

    if (!body.reason || typeof body.reason !== 'string' || body.reason.trim().length < 10) {
      return NextResponse.json(
        { error: 'reason is required and must be at least 10 characters' },
        { status: 400 }
      )
    }

    // Get current value
    const { data: currentFlag } = await supabaseAdmin
      .from('system_flags')
      .select('value')
      .eq('key', 'scheduling_enabled')
      .single()

    const oldValue = currentFlag?.value ?? true

    // Update flag
    const { data: updatedFlag, error: updateError } = await supabaseAdmin
      .from('system_flags')
      .upsert({
        key: 'scheduling_enabled',
        value: body.enabled,
        updated_by: adminUser.id,
        reason: body.reason.trim(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'key'
      })
      .select()
      .single()

    if (updateError) {
      console.error('Failed to update scheduling flag:', updateError)
      return NextResponse.json(
        { error: 'Failed to update scheduling flag' },
        { status: 500 }
      )
    }

    // Emit audit log
    const { error: auditError } = await supabaseAdmin
      .from('audit_log')
      .insert({
        actor_id: adminUser.id,
        action: 'SYSTEM_FLAG_CHANGED',
        reason: body.reason.trim(),
        meta: {
          flag: 'scheduling_enabled',
          old_value: oldValue,
          new_value: body.enabled
        },
        created_at: new Date().toISOString()
      })

    if (auditError) {
      console.error('Failed to write audit log:', auditError)
      // Don't fail the request - flag was updated successfully
    }

    return NextResponse.json({
      success: true,
      flag: {
        key: updatedFlag.key,
        value: updatedFlag.value,
        updated_at: updatedFlag.updated_at,
        updated_by: updatedFlag.updated_by,
        reason: updatedFlag.reason
      }
    })

  } catch (error) {
    console.error('Error toggling scheduling:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/system-flags/scheduling
 * 
 * Get current scheduling flag status
 */
export async function GET(req: NextRequest) {
  try {
    // Get admin user
    const supabase = createSupabaseServerClient()
    const { data: { session } } = await supabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json(
        { error: 'Forbidden - Admin access required' },
        { status: 403 }
      )
    }

    // Get current flag
    const { data: flag, error } = await supabaseAdmin
      .from('system_flags')
      .select('key, value, updated_at, updated_by, reason')
      .eq('key', 'scheduling_enabled')
      .single()

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      console.error('Failed to read scheduling flag:', error)
      return NextResponse.json(
        { error: 'Failed to read scheduling flag' },
        { status: 500 }
      )
    }

    // Default to enabled if flag doesn't exist
    if (!flag) {
      return NextResponse.json({
        flag: {
          key: 'scheduling_enabled',
          value: true,
          updated_at: null,
          updated_by: null,
          reason: null
        }
      })
    }

    return NextResponse.json({ flag })

  } catch (error) {
    console.error('Error reading scheduling flag:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

