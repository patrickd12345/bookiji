import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import { cookies } from 'next/headers'

async function checkAdminAuth() {
  const { url, secretKey } = getSupabaseConfig()
  const cookieStore = cookies()
  
  const supabase = createClient(url, secretKey!, { 
    auth: { persistSession: false },
    global: { headers: { Cookie: cookieStore.toString() } }
  })
  
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  if (authError || !user) {
    return { authorized: false, supabase: null, user: null }
  }
  
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle()
  
  if (!profile || profile.role !== 'admin') {
    return { authorized: false, supabase: null, user: null }
  }
  
  return { authorized: true, supabase, user }
}

async function logAuditEvent(supabase: any, userId: string, action: string, entityType: string, entityId: string, metadata: any) {
  try {
    await supabase
      .from('audit_logs')
      .insert({
        user_id: userId,
        action,
        entity_type: entityType,
        entity_id: entityId,
        metadata,
        created_at: new Date().toISOString()
      })
  } catch (error) {
    console.error('Failed to log audit event:', error)
    // Don't fail the main operation if audit logging fails
  }
}

export async function POST(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: vendorId } = await context.params
    const { authorized, supabase, user } = await checkAdminAuth()
    
    if (!authorized || !supabase || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { action, reason } = await request.json()

    if (!action || !reason?.trim()) {
      return NextResponse.json({ error: 'Action and reason are required' }, { status: 400 })
    }

    // Get current vendor state
    const { data: vendor, error: fetchError } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_active, role')
      .eq('id', vendorId)
      .eq('role', 'vendor')
      .maybeSingle()

    if (fetchError || !vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    let updateData: any = {}
    let auditMetadata: any = { 
      reason, 
      previous_status: vendor.is_active ? 'active' : 'inactive',
      vendor_email: vendor.email,
      vendor_name: vendor.full_name
    }

    switch (action) {
      case 'activate':
        if (vendor.is_active) {
          return NextResponse.json({ error: 'Vendor is already active' }, { status: 400 })
        }
        updateData = { 
          is_active: true,
          updated_at: new Date().toISOString()
        }
        auditMetadata.action_type = 'admin_activate_vendor'
        break

      case 'deactivate':
        if (!vendor.is_active) {
          return NextResponse.json({ error: 'Vendor is already inactive' }, { status: 400 })
        }
        updateData = { 
          is_active: false,
          updated_at: new Date().toISOString()
        }
        auditMetadata.action_type = 'admin_deactivate_vendor'
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update vendor status
    const { error: updateError } = await supabase
      .from('profiles')
      .update(updateData)
      .eq('id', vendorId)

    if (updateError) {
      console.error('Error updating vendor:', updateError)
      return NextResponse.json({ error: 'Failed to update vendor' }, { status: 500 })
    }

    // Log audit event
    await logAuditEvent(
      supabase, 
      user.id, 
      action, 
      'vendor', 
      vendorId, 
      auditMetadata
    )

    return NextResponse.json({ 
      success: true, 
      message: `Vendor ${action}d successfully` 
    })
    
  } catch (error) {
    console.error('Error in admin vendor actions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
