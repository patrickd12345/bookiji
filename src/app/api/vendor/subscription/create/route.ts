import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { AuthManager } from '@/lib/auth'
import { StripeService } from '@/lib/services/stripe'

/**
 * Create vendor subscription
 * POST /api/vendor/subscription/create
 * Body: { planId: string, billingCycle: 'monthly' | 'annual' }
 */
export async function POST(request: NextRequest) {
  try {
    const user = await AuthManager.getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const { planId, billingCycle = 'monthly' } = body

    if (!planId) {
      return NextResponse.json({ error: 'Missing planId' }, { status: 400 })
    }

    const supabase = createSupabaseServerClient()

    // Get vendor profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, email, role')
      .eq('auth_user_id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    if (profile.role !== 'vendor') {
      return NextResponse.json({ error: 'Not a vendor' }, { status: 403 })
    }

    // Check for existing subscription
    const { data: existingSub } = await supabase
      .from('vendor_subscriptions')
      .select('*')
      .eq('provider_id', profile.id)
      .single()

    if (existingSub && (existingSub.subscription_status === 'active' || existingSub.subscription_status === 'trialing')) {
      return NextResponse.json({ 
        error: 'Active subscription already exists',
        subscription: existingSub
      }, { status: 400 })
    }

    // Get plan details
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .single()

    if (planError || !plan) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }

    // Get Stripe price ID based on billing cycle
    const stripePriceId = billingCycle === 'annual' 
      ? plan.stripe_price_id_annual 
      : plan.stripe_price_id_monthly

    if (!stripePriceId) {
      return NextResponse.json({ 
        error: 'Stripe price ID not configured for this plan',
        hint: 'Please contact support'
      }, { status: 500 })
    }

    // Create Stripe checkout session
    const successUrl = `${request.nextUrl.origin}/vendor/dashboard/subscription?success=true`
    const cancelUrl = `${request.nextUrl.origin}/vendor/dashboard/subscription?canceled=true`

    const checkoutUrl = await StripeService.createSubscriptionCheckoutSession(
      stripePriceId,
      profile.id,
      profile.email || user.email || '',
      successUrl,
      cancelUrl,
      existingSub?.stripe_customer_id || undefined
    )

    if (!checkoutUrl) {
      return NextResponse.json({ 
        error: 'Failed to create checkout session',
        hint: 'Please try again later'
      }, { status: 500 })
    }

    return NextResponse.json({
      checkoutUrl,
      plan: {
        id: plan.id,
        name: plan.name,
        planType: plan.plan_type,
        billingCycle: plan.billing_cycle,
        priceCents: plan.price_cents,
        trialDays: plan.trial_days
      }
    })

  } catch (error) {
    console.error('Create subscription API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later'
    }, { status: 500 })
  }
}
