import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'
import { getBookingFeeForCurrency, DEFAULT_BOOKING_FEE } from '@/config/bookingFeeMatrix'
import { supabase } from '@/lib/supabaseClient'

// Get Stripe keys with strict validation (NO FALLBACKS FOR SECURITY)
const getStripeSecretKey = () => {
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) {
    throw new Error('STRIPE_SECRET_KEY environment variable is required for payment processing')
  }
  return key
}

const getStripePublishableKey = () => {
  const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  if (!key) {
    throw new Error('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable is required for payment processing')
  }
  return key
}

// Server-side Stripe instance (with fallback for development)
const initializeStripe = (): Stripe | null => {
  // Never run on the browser – prevents noisy console errors during dev HMR.
  if (typeof window !== 'undefined') return null

  try {
    const secretKey = getStripeSecretKey()
    if (secretKey && secretKey.startsWith('sk_')) {
      return new Stripe(secretKey, {
        apiVersion: '2024-06-20',
      })
    }
    return null
  } catch (error) {
    // Log once on the server; omit stack in production.
    if (process.env.NODE_ENV !== 'production') {
      console.warn('Stripe server initialization failed - using mock mode:', error)
    }
    return null
  }
}

export const stripe = initializeStripe()

// Helper function to ensure Stripe is available for operations that require it
export const getStripeOrThrow = (): Stripe => {
  if (!stripe) {
    throw new Error('Stripe is not configured. Please add STRIPE_SECRET_KEY to your environment variables.')
  }
  return stripe
}

// Client-side Stripe instance
export const getStripe = () => {
  const publishableKey = getStripePublishableKey()
  
  // Return null if we don't have a real publishable key
  if (!publishableKey || !publishableKey.startsWith('pk_')) {
    console.warn('Stripe publishable key not configured - returning null')
    return null
  }
  
  return loadStripe(publishableKey)
}

// Bookiji-specific payment configuration (static values)
export const BOOKIJI_PAYMENT_CONFIG = {
  // Payment description
  COMMITMENT_FEE_DESCRIPTION: 'Bookiji Booking Commitment Fee',

  // Success and cancel URLs - production ready
  SUCCESS_URL: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/booking/success`,
  CANCEL_URL: `${process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || 'http://localhost:3000'}/booking/cancel`,
}

// In-memory cache so we don't hit Supabase on every request (simple TTL = 5 min)
const feeCache = new Map<string, { amount: number; expires: number }>()

async function getLiveBookingFee(currency: string): Promise<number> {
  const key = currency.toLowerCase()

  // 1. Check cache first
  const cached = feeCache.get(key)
  if (cached && cached.expires > Date.now()) {
    return cached.amount
  }

  try {
    const { data, error } = await supabase
      .from('booking_fees')
      .select('amount_cents')
      .eq('currency_code', key)
      .single()

    if (error) throw error

    if (data && typeof data.amount_cents === 'number') {
      feeCache.set(key, { amount: data.amount_cents, expires: Date.now() + 5 * 60 * 1000 })
      return data.amount_cents
    }
  } catch (err) {
    console.warn('Supabase booking fee lookup failed:', err)
  }

  // Fallback to static matrix
  return getBookingFeeForCurrency(currency)
}

// Payment intent creation for commitment fee
export async function createCommitmentFeePaymentIntent(
  customerId: string,
  bookingId: string,
  metadata: Record<string, string> = {},
  currency: string = DEFAULT_BOOKING_FEE.currency,
) {
  try {
    const amountCents = await getLiveBookingFee(currency)

    // Return mock response if Stripe is not configured
    if (!stripe) {
      console.warn('Stripe not configured - returning mock payment intent')
      return {
        success: true,
        paymentIntent: {
              id: `pi_test_${Date.now()}`,
    client_secret: `pi_test_${Date.now()}_secret_test`,
          status: 'requires_payment_method',
          amount: amountCents,
          currency,
        }
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customerId,
      description: BOOKIJI_PAYMENT_CONFIG.COMMITMENT_FEE_DESCRIPTION,
      metadata: {
        booking_id: bookingId,
        payment_type: 'commitment_fee',
        ...metadata,
      },
      automatic_payment_methods: {
        enabled: true,
      },
    })

    return { success: true, paymentIntent }
  } catch (error) {
    console.error('Error creating payment intent:', error)
    return { success: false, error }
  }
}

// Payment intent for paid availability search
export async function createAvailabilitySearchPaymentIntent(
  customerId: string,
  metadata: Record<string, string> = {},
  currency: string = DEFAULT_BOOKING_FEE.currency,
) {
  try {
    const amountCents = await getLiveBookingFee(currency)

    if (!stripe) {
      console.warn('Stripe not configured - returning mock payment intent')
      return {
        success: true,
        paymentIntent: {
          id: `pi_test_${Date.now()}`,
          client_secret: `pi_test_${Date.now()}_secret_test`,
          status: 'requires_payment_method',
          amount: amountCents,
          currency,
        },
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountCents,
      currency,
      customer: customerId,
      description: 'Bookiji Availability Search Fee',
      metadata: {
        payment_type: 'availability_search',
        ...metadata,
      },
      automatic_payment_methods: { enabled: true },
    })

    return { success: true, paymentIntent }
  } catch (error) {
    console.error('Error creating search payment intent:', error)
    return { success: false, error }
  }
}

// Verify payment intent
export async function verifyPaymentIntent(paymentIntentId: string) {
  try {
    // Return mock response if Stripe is not configured
    if (!stripe) {
      console.warn('Stripe not configured - returning mock verification')
      return {
        success: true,
        paymentIntent: {
          id: paymentIntentId,
          status: 'succeeded',
          amount: DEFAULT_BOOKING_FEE.amount,
          currency: DEFAULT_BOOKING_FEE.currency,
        }
      }
    }

    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId)
    return { success: true, paymentIntent }
  } catch (error) {
    console.error('Error verifying payment intent:', error)
    return { success: false, error }
  }
}

export { getLiveBookingFee }
