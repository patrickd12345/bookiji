import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabaseClient'
import { stripe } from '@/lib/stripe'
import { createCommitmentFeePaymentIntent } from '../../../../../lib/stripe'
import { supabase } from '@/lib/supabaseClient'
import { detectLocaleFromHeaders } from '@/lib/i18n/config'
import type Stripe from 'stripe'

type CreatePaymentIntentRequest = {
  amount: number
  currency?: string
  customerId?: string | null
}

type PaymentIntentParams = Omit<Stripe.PaymentIntentCreateParams, 'customer'> & {
  customer?: string
}

function isValidCustomerId(id: string | null | undefined): id is string {
  return typeof id === 'string' && id.length > 0
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json() as CreatePaymentIntentRequest
    const { amount, currency = 'usd', customerId } = data

    if (!amount) {
      return NextResponse.json({ error: 'Amount is required' }, { status: 400 })
    }

    const baseParams = {
      amount,
      currency,
      automatic_payment_methods: {
        enabled: true,
      }
    }

    // Create payment intent with or without customer
    const paymentIntent = await stripe.paymentIntents.create(
      typeof customerId === 'string' && customerId
        ? { ...baseParams, customer: customerId as string }
        : baseParams
    )

    return NextResponse.json({ clientSecret: paymentIntent.client_secret })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create payment intent' },
      { status: 500 }
    )
  }
}

export async function POST_OLD(request: Request) {
  try {
    const { customerId, bookingId, serviceDetails } = await request.json()

    if (!customerId || !bookingId) {
      return NextResponse.json({ 
        error: 'Customer ID and Booking ID are required' 
      }, { status: 400 })
    }
    const locale = request.headers.get('accept-language') || undefined
    const localeInfo = detectLocaleFromHeaders(locale)
    const currency = localeInfo.currency

    console.log('💳 Creating payment intent for booking:', bookingId, 'currency:', currency)

    const result = await createCommitmentFeePaymentIntent(
      customerId,
      bookingId,
      {
        service_details: JSON.stringify(serviceDetails || {}),
        timestamp: new Date().toISOString(),
      },
      currency
    )

    if (!result.success || !result.paymentIntent) {
      throw new Error('Failed to create payment intent')
    }

    console.log('💳 Payment intent created:', result.paymentIntent.id)

    return NextResponse.json({
      success: true,
      clientSecret: result.paymentIntent.client_secret,
      paymentIntentId: result.paymentIntent.id,
      amount: result.paymentIntent.amount,
      currency: result.paymentIntent.currency,
    })

  } catch (error) {
    console.error('❌ Payment intent creation error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to create payment intent',
      success: false
    }, { status: 500 })
  }
} 