import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { AuthManager } from '@/lib/auth'

/**
 * Get vendor subscription status
 * GET /api/vendor/subscription/status
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
      .select('id, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Get subscription with features
    const { data: subscription, error: subError } = await supabase
      .from('vendor_subscriptions')
      .select(`
        *,
        vendor_subscription_features (*)
      `)
      .eq('provider_id', profile.id)
      .single()

    if (subError && subError.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching subscription:', subError)
      return NextResponse.json({ error: 'Failed to fetch subscription' }, { status: 500 })
    }

    // Get available plans
    const { data: plans, error: plansError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price_cents', { ascending: true })

    if (plansError) {
      console.warn('Error fetching plans:', plansError)
    }

    // Check if subscription is active (including trial)
    const isActive = subscription && (
      subscription.subscription_status === 'active' ||
      subscription.subscription_status === 'trialing' ||
      (subscription.trial_end && new Date(subscription.trial_end) > new Date())
    )

    return NextResponse.json({
      subscription: subscription || null,
      isActive: !!isActive,
      plans: plans || [],
      vendorId: profile.id
    })

  } catch (error) {
    console.error('Subscription status API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}
