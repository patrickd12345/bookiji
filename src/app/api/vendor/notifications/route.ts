import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { AuthManager } from '@/lib/auth'

/**
 * Get/Update vendor notification preferences
 * GET /api/vendor/notifications - Get preferences
 * POST /api/vendor/notifications - Update preferences
 */
export async function GET(_request: NextRequest) {
  try {
    const user = await AuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createSupabaseServerClient()

    // Get vendor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role, notification_preferences')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Return notification preferences (defaults if not set)
    const preferences = profile.notification_preferences || {
      email: {
        new_booking: true,
        booking_confirmed: true,
        booking_cancelled: true,
        customer_message: true,
        payment_received: true
      },
      sms: {
        new_booking: false,
        booking_confirmed: false,
        booking_cancelled: true, // Critical alerts via SMS
        customer_message: false,
        payment_received: false
      },
      push: {
        new_booking: true,
        booking_confirmed: true,
        booking_cancelled: true,
        customer_message: true
      }
    }

    return NextResponse.json({
      preferences,
      vendorId: profile.id
    })

  } catch (error) {
    console.error('Get notifications API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await AuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { preferences } = body

    if (!preferences) {
      return NextResponse.json({ error: 'Missing preferences' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Get vendor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Update notification preferences
    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        notification_preferences: preferences,
        updated_at: new Date().toISOString()
      })
      .eq('id', profile.id)

    if (updateError) {
      console.error('Error updating preferences:', updateError)
      return NextResponse.json({
        error: 'Failed to update preferences',
        hint: 'Please try again later'
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Notification preferences updated'
    })

  } catch (error) {
    console.error('Update notifications API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}
