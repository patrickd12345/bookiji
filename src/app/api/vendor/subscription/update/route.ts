import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { AuthManager } from '@/lib/auth'
import { StripeService } from '@/lib/services/stripe'

/**
 * Update vendor subscription (change plan, etc.)
 * POST /api/vendor/subscription/update
 * Body: { planId?: string, billingCycle?: 'monthly' | 'annual' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { planId, billingCycle } = body

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

    // Get current subscription
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

    // If changing plan, get new plan details
    if (planId) {
      const { data: plan, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .eq('is_active', true)
        .single()

      if (planError || !plan) {
        return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
      }

      const newPriceId = billingCycle === 'annual' 
        ? plan.stripe_price_id_annual 
        : plan.stripe_price_id_monthly

      if (!newPriceId) {
        return NextResponse.json({ 
          error: 'Stripe price ID not configured for this plan',
          hint: 'Please contact support'
        }, { status: 500 })
      }

      // Update subscription with new price
      try {
        await StripeService.updateSubscription(subscription.stripe_subscription_id, {
          items: [{ price: newPriceId }],
          metadata: {
            plan_id: planId,
            plan_type: plan.plan_type,
            billing_cycle: billingCycle || plan.billing_cycle
          }
        })

        // Update local record
        await supabase
          .from('vendor_subscriptions')
          .update({
            plan_id: planId,
            plan_type: plan.plan_type,
            billing_cycle: billingCycle || plan.billing_cycle
          })
          .eq('id', subscription.id)

        return NextResponse.json({
          success: true,
          message: 'Subscription plan updated',
          plan: {
            id: plan.id,
            name: plan.name,
            planType: plan.plan_type,
            billingCycle: billingCycle || plan.billing_cycle
          }
        })
      } catch (stripeError) {
        console.error('Stripe update error:', stripeError)
        return NextResponse.json({
          error: 'Failed to update subscription',
          hint: 'Please try again or contact support'
        }, { status: 500 })
      }
    }

    return NextResponse.json({ error: 'No update parameters provided' }, { status: 400 })

  } catch (error) {
    console.error('Update subscription API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}
