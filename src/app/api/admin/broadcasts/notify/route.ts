import { NextRequest, NextResponse } from 'next/server'
import { getServerSupabase } from '@/lib/supabaseServer'
import { getAuthenticatedUserId } from '@/app/api/_utils/auth'

export async function POST(request: NextRequest) {
  try {
    const userId = await getAuthenticatedUserId(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { message, _broadcastIds } = await request.json()

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const supabase = getServerSupabase()
    
    // Get all vendors
    const { data: vendors, error: vendorError } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'vendor')

    if (vendorError) {
      console.error('Vendor fetch error:', vendorError)
      return NextResponse.json({ error: 'Failed to fetch vendors' }, { status: 500 })
    }

    if (!vendors || vendors.length === 0) {
      return NextResponse.json({ error: 'No vendors found' }, { status: 400 })
    }

    // Create notifications for all vendors
    const notifications = vendors.map(vendor => ({
      user_id: vendor.id,
      type: 'broadcast',
      title: 'New Broadcast',
      message: message,
      created_at: new Date().toISOString()
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('Notification creation error:', notifError)
      return NextResponse.json({ error: 'Failed to create notifications' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      recipientCount: vendors.length,
      message: `Notifications sent to ${vendors.length} vendors` 
    })
  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}










