import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'
import { StripeService } from '@/lib/services/stripe'

export const config = {
  api: {
    bodyParser: false,
  },
}

export async function POST(req: Request) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  if (!stripeWebhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  if (!supabaseUrl) {
    console.error('NEXT_PUBLIC_SUPABASE_URL is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  if (!supabaseServiceRoleKey) {
    console.error('SUPABASE_SERVICE_ROLE_KEY is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20',
  })

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event

  // TypeScript narrowing - stripeWebhookSecret is checked at module level
  const webhookSecret: string = stripeWebhookSecret!
  if (!webhookSecret) {
    return NextResponse.json({ error: 'STRIPE_WEBHOOK_SECRET is not configured' }, { status: 500 })
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    console.error('Webhook signature failed:', err?.message || err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  if (event.type === 'payment_intent.succeeded') {
    const intent = event.data.object as Stripe.PaymentIntent

    const paymentIntentId = intent.id

    const { error } = await supabase
      .from('bookings')
      .update({ status: 'confirmed' })
      .eq('stripe_payment_intent_id', paymentIntentId)

    if (error) {
      console.error('Supabase update error:', error.message)
      return NextResponse.json({ error: 'Supabase error' }, { status: 500 })
    }

    console.log('Booking confirmed:', paymentIntentId)
  } else if (event.type === 'checkout.session.completed') {
    await StripeService.handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
  } else if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.deleted') {
    // Pass webhook event ID for idempotency
    await StripeService.handleSubscriptionChange(
      event.data.object as Stripe.Subscription,
      event.id // Webhook event ID for idempotency
    )
  }

  return NextResponse.json({ received: true })
}
