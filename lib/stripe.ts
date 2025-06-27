import Stripe from 'stripe'
import { loadStripe } from '@stripe/stripe-js'

// Get Stripe keys with fallbacks for development
const getStripeSecretKey = () => {
  return process.env.STRIPE_SECRET_KEY || 'sk_test_development_fallback_key'
}

const getStripePublishableKey = () => {
  return process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_development_fallback_key'
}

// Server-side Stripe instance (with fallback for development)
const initializeStripe = (): Stripe | null => {
  try {
    const secretKey = getStripeSecretKey()
    if (secretKey && secretKey !== 'sk_test_development_fallback_key') {
      return new Stripe(secretKey, {
        apiVersion: '2024-06-20',
      })
    }
    return null
  } catch (error) {
    console.warn('Stripe server initialization failed - using mock mode:', error)
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
  if (!publishableKey || publishableKey === 'pk_test_development_fallback_key') {
    console.warn('Stripe publishable key not configured - returning null')
    return null
  }
  
  return loadStripe(publishableKey)
}

// Bookiji-specific payment configuration
export const BOOKIJI_PAYMENT_CONFIG = {
  // Commitment fee in cents ($1.00)
  COMMITMENT_FEE_CENTS: 100,
  
  // Currency
  CURRENCY: 'usd',
  
  // Payment description
  COMMITMENT_FEE_DESCRIPTION: 'Bookiji Booking Commitment Fee',
  
  // Success and cancel URLs
  SUCCESS_URL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/booking/success`,
  CANCEL_URL: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/booking/cancel`,
}

// Payment intent creation for commitment fee
export async function createCommitmentFeePaymentIntent(
  customerId: string,
  bookingId: string,
  metadata: Record<string, string> = {}
) {
  try {
    // Return mock response if Stripe is not configured
    if (!stripe) {
      console.warn('Stripe not configured - returning mock payment intent')
      return {
        success: true,
        paymentIntent: {
          id: `pi_mock_${Date.now()}`,
          client_secret: `pi_mock_${Date.now()}_secret_mock`,
          status: 'requires_payment_method',
          amount: BOOKIJI_PAYMENT_CONFIG.COMMITMENT_FEE_CENTS,
          currency: BOOKIJI_PAYMENT_CONFIG.CURRENCY,
        }
      }
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: BOOKIJI_PAYMENT_CONFIG.COMMITMENT_FEE_CENTS,
      currency: BOOKIJI_PAYMENT_CONFIG.CURRENCY,
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
          amount: BOOKIJI_PAYMENT_CONFIG.COMMITMENT_FEE_CENTS,
          currency: BOOKIJI_PAYMENT_CONFIG.CURRENCY,
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