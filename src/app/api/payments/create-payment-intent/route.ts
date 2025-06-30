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

// Legacy POST_OLD handler removed — kept in Git history if we ever need to reference it. 