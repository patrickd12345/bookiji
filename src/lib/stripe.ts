import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'
import { supabase } from '@/lib/supabaseClient'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
  typescript: true,
})

export const getStripe = () => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  return pk ? loadStripe(pk) : null
}

export const getStripeOrThrow = () => {
  if (!stripe) {
    throw new Error('Stripe not configured')
  }
  return stripe
}

export async function createCommitmentFeePaymentIntent(amount: number, currency: string = 'usd', idempotencyKey?: string) {
  return stripe.paymentIntents.create(
    {
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    },
    idempotencyKey ? { idempotencyKey } : undefined
  )
}

export async function createBookingPaymentIntent(amount: number, bookingId: string, customerId?: string, idempotencyKey?: string) {
  const key = idempotencyKey || `booking-${bookingId}`
  const intent = await stripe.paymentIntents.create(
    {
      amount,
      currency: 'usd',
      customer: customerId,
      metadata: { bookingId },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: key }
  )

  await supabase.from('bookings').update({ idempotency_key: key }).eq('id', bookingId)
  return intent
}

export async function refundPayment(paymentIntentId: string, amount?: number, idempotencyKey?: string) {
  return stripe.refunds.create(
    { payment_intent: paymentIntentId, amount },
    idempotencyKey ? { idempotencyKey } : undefined
  )
}
