import { NextResponse } from 'next/server'
import { createCommitmentFeePaymentIntent } from '../../../../../lib/stripe'
import { supabase } from '@/lib/supabaseClient'

export async function POST(request: Request) {
  try {
    const { customerId, bookingId, serviceDetails } = await request.json()

    if (!customerId || !bookingId) {
      return NextResponse.json({ 
        error: 'Customer ID and Booking ID are required' 
      }, { status: 400 })
    }

    console.log('💳 Creating payment intent for booking:', bookingId)

    // Create payment intent for $1 commitment fee
    const result = await createCommitmentFeePaymentIntent(
      customerId,
      bookingId,
      {
        service_details: JSON.stringify(serviceDetails || {}),
        timestamp: new Date().toISOString(),
      }
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