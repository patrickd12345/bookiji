import { NextRequest, NextResponse } from 'next/server'
import { getStripeOrThrow } from '../../../../../lib/stripe'
import { supabase } from '@/lib/supabaseClient'
import { trackPaymentSuccess, trackPaymentFailure } from '@/lib/analytics'

export async function POST(req: NextRequest) {
  const body = await req.text()
  const signature = req.headers.get('stripe-signature')

  if (!signature) {
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event
  try {
    const stripe = getStripeOrThrow()
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    console.error('Webhook signature verification failed:', err)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log('🎣 Webhook received:', event.type)

  try {
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object)
        break
      case 'payment_intent.payment_failed':
        await handlePaymentFailed(event.data.object)
        break
      case 'payment_intent.canceled':
        await handlePaymentCanceled(event.data.object)
        break
      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error) {
    console.error('Webhook handler error:', error)
    return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
  }
}

async function handlePaymentSucceeded(paymentIntent: any) {
  const bookingId = paymentIntent.metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking ID in payment intent metadata')
    return
  }

  console.log('✅ Payment succeeded for booking:', bookingId)

  // Update booking status to confirmed
  const { error } = await supabase
    .from('bookings')
    .update({ 
      status: 'confirmed',
      commitment_fee_paid: true,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating booking status:', error)
    return
  }

  trackPaymentSuccess({
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    country: paymentIntent.charges?.data?.[0]?.billing_details?.address?.country,
    paymentMethod: paymentIntent.charges?.data?.[0]?.payment_method_details?.type || paymentIntent.payment_method_types?.[0],
    bookingId
  })

  // Send notifications
  try {
    // Send payment success notification to customer
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'payment_success',
        bookingId
      })
    })

    // Send booking confirmation to customer
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'booking_confirmation',
        bookingId
      })
    })

    // Send provider alert
    await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL}/api/notifications/send`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type: 'provider_alert',
        bookingId
      })
    })

    console.log('📧 All notifications sent for booking:', bookingId)
  } catch (notificationError) {
    console.error('Error sending notifications:', notificationError)
  }
}

async function handlePaymentFailed(paymentIntent: any) {
  const bookingId = paymentIntent.metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking ID in payment intent metadata')
    return
  }

  console.log('❌ Payment failed for booking:', bookingId)

  // Update booking status to cancelled
  const { error } = await supabase
    .from('bookings')
    .update({
      status: 'cancelled',
      commitment_fee_paid: false,
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating booking status after payment failure:', error)
  }

  trackPaymentFailure({
    amount: paymentIntent.amount,
    currency: paymentIntent.currency,
    country: paymentIntent.charges?.data?.[0]?.billing_details?.address?.country,
    paymentMethod: paymentIntent.charges?.data?.[0]?.payment_method_details?.type || paymentIntent.payment_method_types?.[0],
    bookingId
  })
}

async function handlePaymentCanceled(paymentIntent: any) {
  const bookingId = paymentIntent.metadata?.booking_id
  
  if (!bookingId) {
    console.error('No booking ID in payment intent metadata')
    return
  }

  console.log('🚫 Payment canceled for booking:', bookingId)

  // Update booking status to cancelled
  const { error } = await supabase
    .from('bookings')
    .update({ 
      status: 'cancelled',
      updated_at: new Date().toISOString()
    })
    .eq('id', bookingId)

  if (error) {
    console.error('Error updating booking status:', error)
  }
} 