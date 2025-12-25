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
    
    // Get bookings in the next 24 hours
    const tomorrow = new Date()
    tomorrow.setHours(tomorrow.getHours() + 24)
    const now = new Date()

    const { data: bookings, error: bookingError } = await supabase
      .from('bookings')
      .select('id, customer_id, scheduled_at')
      .gte('scheduled_at', now.toISOString())
      .lte('scheduled_at', tomorrow.toISOString())
      .eq('status', 'confirmed')

    if (bookingError) {
      console.error('Booking fetch error:', bookingError)
      return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 })
    }

    if (!bookings || bookings.length === 0) {
      return NextResponse.json({ 
        success: true, 
        recipientCount: 0,
        message: 'No upcoming bookings to remind' 
      })
    }

    // Create reminder notifications
    const notifications = bookings.map(booking => ({
      user_id: booking.customer_id,
      type: 'reminder',
      title: 'Upcoming Booking Reminder',
      message: `You have a booking scheduled soon. Please check your dashboard for details.`,
      created_at: new Date().toISOString()
    }))

    const { error: notifError } = await supabase
      .from('notifications')
      .insert(notifications)

    if (notifError) {
      console.error('Reminder creation error:', notifError)
      return NextResponse.json({ error: 'Failed to create reminders' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      recipientCount: bookings.length,
      message: `Reminders sent to ${bookings.length} customers` 
    })
  } catch (error) {
    console.error('Reminder error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}











