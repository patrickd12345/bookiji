import Stripe from 'stripe'

if (!process.env.STRIPE_SECRET_KEY) {
  throw new Error('Missing STRIPE_SECRET_KEY environment variable')
}

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20', // Latest supported version
  typescript: true,
})

export async function createCommitmentFeePaymentIntent(amount: number, currency: string = 'usd') {
  return stripe.paymentIntents.create({
    amount,
    currency,
    automatic_payment_methods: {
      enabled: true,
    },
  })
}

export async function createBookingPaymentIntent(amount: number, bookingId: string, customerId?: string) {
  return stripe.paymentIntents.create({
    amount,
    currency: 'usd',
    customer: customerId,
    metadata: {
      bookingId,
    },
    automatic_payment_methods: {
      enabled: true,
    },
  })
}

export async function refundPayment(paymentIntentId: string, amount?: number) {
  return stripe.refunds.create({
    payment_intent: paymentIntentId,
    amount
  })
}
