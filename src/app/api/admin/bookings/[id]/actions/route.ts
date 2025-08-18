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
    const { id: bookingId } = await context.params
    const { authorized, supabase, user } = await checkAdminAuth()
    
    if (!authorized || !supabase || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const { action, reason } = await request.json()

    if (!action || !reason?.trim()) {
      return NextResponse.json({ error: 'Action and reason are required' }, { status: 400 })
    }

    // Get current booking state
    const { data: booking, error: fetchError } = await supabase
      .from('bookings')
      .select('id, status, customer_id, vendor_id')
      .eq('id', bookingId)
      .maybeSingle()

    if (fetchError || !booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 })
    }

    let updateData: any = {}
    const auditMetadata: any = { reason, previous_status: booking.status }

    switch (action) {
      case 'cancel':
        if (!['pending', 'confirmed'].includes(booking.status)) {
          return NextResponse.json({ error: 'Cannot cancel booking in current status' }, { status: 400 })
        }
        updateData = { 
          status: 'cancelled',
          updated_at: new Date().toISOString()
        }
        auditMetadata.action_type = 'admin_cancel'
        break

      case 'release_hold':
        // Delete any reschedule tokens to release hold
        await supabase
          .from('reschedule_tokens')
          .delete()
          .eq('booking_id', bookingId)
        
        auditMetadata.action_type = 'admin_release_hold'
        break

      case 'mark_no_show':
        if (booking.status !== 'confirmed') {
          return NextResponse.json({ error: 'Can only mark confirmed bookings as no-show' }, { status: 400 })
        }
        updateData = { 
          status: 'no_show',
          updated_at: new Date().toISOString()
        }
        auditMetadata.action_type = 'admin_mark_no_show'
        break

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }

    // Update booking if needed
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('bookings')
        .update(updateData)
        .eq('id', bookingId)

      if (updateError) {
        console.error('Error updating booking:', updateError)
        return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 })
      }
    }

    // Log audit event
    await logAuditEvent(
      supabase, 
      user.id, 
      action, 
      'booking', 
      bookingId, 
      auditMetadata
    )

    return NextResponse.json({ 
      success: true, 
      message: `Booking ${action.replace('_', ' ')} completed successfully` 
    })
    
  } catch (error) {
    console.error('Error in admin booking actions API:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
