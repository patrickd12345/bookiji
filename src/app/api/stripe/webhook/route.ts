import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

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
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, sig, stripeWebhookSecret)
  } catch (err: any) {
    console.error('Webhook signature failed:', err?.message || err)
    return new NextResponse('Invalid signature', { status: 400 })
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
      return new NextResponse('Supabase error', { status: 500 })
    }

    console.log('Booking confirmed:', paymentIntentId)
  }

  return NextResponse.json({ received: true })
}
