import { NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

export const config = {
  api: {
    bodyParser: false,
  },
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY
const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!stripeSecretKey) {
  throw new Error('STRIPE_SECRET_KEY is not configured')
}

if (!stripeWebhookSecret) {
  throw new Error('STRIPE_WEBHOOK_SECRET is not configured')
}

if (!supabaseUrl) {
  throw new Error('NEXT_PUBLIC_SUPABASE_URL is not configured')
}

if (!supabaseServiceRoleKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured')
}

const stripe = new Stripe(stripeSecretKey, {
  apiVersion: '2024-06-20',
})

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export async function POST(req: Request) {
  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return new NextResponse('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event

  // TypeScript narrowing - stripeWebhookSecret is checked at module level
  const webhookSecret: string = stripeWebhookSecret!
  if (!webhookSecret) {
    return new NextResponse('STRIPE_WEBHOOK_SECRET is not configured', { status: 500 })
  }

  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
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
