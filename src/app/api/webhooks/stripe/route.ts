import { NextRequest, NextResponse } from 'next/server'
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { createClient } from '@supabase/supabase-js'
import { headers } from 'next/headers'
import Stripe from 'stripe'
import { featureFlags } from '@/config/featureFlags'
import { StripeService } from '@/lib/services/stripe'

// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies';

/**
 * AUTHORITATIVE PATH — Stripe Webhook Handler
 * 
 * This is the ONLY path to transition bookings from hold_placed to confirmed.
 * Webhooks intentionally bypass kill switches to process in-flight operations.
 * 
 * See: docs/invariants/webhooks.md
 * - INV-3: Webhook Only Updates Existing Bookings
 * - INV-4: Webhook Bypass Kill Switch (Intentional)
 */

async function webhookHandler(req: NextRequest): Promise<NextResponse> {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!stripeSecretKey) {
    console.error('STRIPE_SECRET_KEY is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  if (!endpointSecret) {
    console.error('STRIPE_WEBHOOK_SECRET is not configured')
    return new NextResponse('Server Configuration Error', { status: 500 })
  }

  const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2024-06-20'
  })

  if (!featureFlags.beta.core_booking_flow) {
    return NextResponse.json(
      { error: 'Core booking flow not enabled' },
      { status: 403 }
    )
  }

  try {
    const body = await req.text()
    const headersList = await headers()
    const sig = headersList.get('stripe-signature')

    if (!sig) {
      return NextResponse.json(
        { error: 'Missing stripe signature' },
        { status: 400 }
      )
    }

    let event: Stripe.Event

    try {
      event = stripe.webhooks.constructEvent(body, sig, endpointSecret)
    } catch (err) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json(
        { error: 'Invalid signature' },
        { status: 400 }
      )
    }

    console.warn(`Processing webhook: ${event.type}`)

    // Handle the event
    switch (event.type) {
      case 'payment_intent.succeeded':
        await StripeService.handlePaymentSucceeded(event)
        break
      
      case 'payment_intent.payment_failed':
        await StripeService.handlePaymentFailed(event)
        break
      
      case 'payment_intent.canceled':
        await StripeService.handlePaymentCanceled(event)
        break
      
      default:
        console.warn(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })

  } catch (error) {
    console.error('Webhook error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export const POST = webhookHandler
