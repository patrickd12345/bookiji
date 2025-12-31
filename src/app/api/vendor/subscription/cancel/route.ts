import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { AuthManager } from '@/lib/auth'
import { StripeService } from '@/lib/services/stripe'

/**
 * Cancel vendor subscription
 * POST /api/vendor/subscription/cancel
 * Body: { cancelAtPeriodEnd: boolean } (optional, defaults to true)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { cancelAtPeriodEnd = true } = body

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

    // Get subscription
    const { data: subscription, error: subError } = await supabase
      .from('vendor_subscriptions')
      .select('*')
      .eq('provider_id', profile.id)
      .single()

    if (subError || !subscription) {
      return NextResponse.json({ error: 'No subscription found' }, { status: 404 })
    }

    if (!subscription.stripe_subscription_id) {
      return NextResponse.json({ error: 'Subscription not linked to Stripe' }, { status: 400 })
    }

    // Cancel via Stripe
    try {
      if (cancelAtPeriodEnd) {
        // Schedule cancellation at period end
        await StripeService.updateSubscription(subscription.stripe_subscription_id, {
          cancel_at_period_end: true
        })

        // Update local record
        await supabase
          .from('vendor_subscriptions')
          .update({ cancel_at_period_end: true })
          .eq('id', subscription.id)

        return NextResponse.json({
          success: true,
          message: 'Subscription will be cancelled at the end of the current period',
          cancelAtPeriodEnd: true
        })
      } else {
        // Cancel immediately
        await StripeService.cancelSubscription(subscription.stripe_subscription_id)

        // Update local record
        await supabase
          .from('vendor_subscriptions')
          .update({ 
            subscription_status: 'canceled',
            cancel_at_period_end: false
          })
          .eq('id', subscription.id)

        return NextResponse.json({
          success: true,
          message: 'Subscription cancelled immediately',
          cancelAtPeriodEnd: false
        })
      }
    } catch (stripeError) {
      console.error('Stripe cancellation error:', stripeError)
      return NextResponse.json({
        error: 'Failed to cancel subscription',
        hint: 'Please try again or contact support'
      }, { status: 500 })
    }

  } catch (error) {
    console.error('Cancel subscription API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}
