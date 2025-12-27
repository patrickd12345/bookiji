import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function POST(request: NextRequest) {
  try {
    // Admin verification
    const authSupabase = createSupabaseServerClient()
    const { data: { session } } = await authSupabase.auth.getSession()
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    const { subject, message, recipientType } = await request.json()

    if (!subject || !message || !recipientType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Get recipients based on type
    let query = supabase.from('profiles').select('id, email, full_name')
    
    if (recipientType === 'vendors') {
      query = query.eq('role', 'vendor')
    } else if (recipientType === 'customers') {
      query = query.eq('role', 'customer')
    }

    const { data: recipients, error } = await query

    if (error) {
      console.error('Newsletter error:', error)
      return NextResponse.json({ error: 'Failed to fetch recipients' }, { status: 500 })
    }

    if (!recipients || recipients.length === 0) {
      return NextResponse.json({ error: 'No recipients found' }, { status: 400 })
    }

    // Create notifications for all recipients
    const notifications = recipients.map(recipient => ({
      user_id: recipient.id,
      type: 'newsletter',
      title: subject,
      message: message,
      created_at: new Date().toISOString()
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('Notification creation error:', notifError)
      // Continue anyway - at least we tried
    }

    return NextResponse.json({ 
      success: true, 
      recipientCount: recipients.length,
      message: `Newsletter sent to ${recipients.length} ${recipientType}` 
    })
  } catch (error) {
    console.error('Newsletter error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}











