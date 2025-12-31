import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'
import { getServerSupabase } from '@/lib/supabaseServer'

const getSupabase = () => getServerSupabase()

// Create a function to get Stripe instance instead of creating it at module load
let _stripe: Stripe | null = null

export function getStripeInstance(): Stripe | null {
  if (!_stripe && process.env.STRIPE_SECRET_KEY) {
    try {
      _stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
        apiVersion: '2024-06-20',
        typescript: true,
      })
    } catch (error) {
      console.warn('Failed to initialize Stripe:', error)
      return null
    }
  }
  return _stripe
}

export const stripe = getStripeInstance()

export const getStripe = () => {
  const pk = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  return pk ? loadStripe(pk) : null
}

export const getStripeOrThrow = () => {
  const instance = getStripeInstance()
  if (!instance) {
    throw new Error('Stripe not configured - missing STRIPE_SECRET_KEY environment variable')
  }
  return instance
}

export async function createCommitmentFeePaymentIntent(amount: number, currency: string = 'usd', idempotencyKey?: string) {
  const instance = getStripeOrThrow()
  return instance.paymentIntents.create(
    {
      amount,
      currency,
      automatic_payment_methods: { enabled: true },
    },
    idempotencyKey ? { idempotencyKey } : undefined
  )
}

export async function createBookingPaymentIntent(amount: number, bookingId: string, customerId?: string, idempotencyKey?: string) {
  const instance = getStripeOrThrow()
  const key = idempotencyKey || `booking-${bookingId}`
  const intent = await instance.paymentIntents.create(
    {
      amount,
      currency: 'usd',
      customer: customerId,
      metadata: { bookingId },
      automatic_payment_methods: { enabled: true },
    },
    { idempotencyKey: key }
  )

  const supabase = getSupabase()
  await supabase.from('bookings').update({ idempotency_key: key }).eq('id', bookingId)
  return intent
}

export async function refundPayment(paymentIntentId: string, amount?: number, idempotencyKey?: string) {
  const instance = getStripeOrThrow()
  return instance.refunds.create(
    { payment_intent: paymentIntentId, amount },
    idempotencyKey ? { idempotencyKey } : undefined
  )
}
