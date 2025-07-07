import { NextRequest, NextResponse } from 'next/server'
import { createCommitmentFeePaymentIntent } from '@/lib/stripe'

interface PaymentIntentRequest {
  amount: number
  currency: string
  customerId: string
  serviceId: string
  bookingId?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: PaymentIntentRequest = await request.json()
    
    // Validate required fields
    if (!body.amount || !body.currency || !body.customerId || !body.serviceId) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }

    // Create payment intent
    const paymentIntent = await createCommitmentFeePaymentIntent(body.amount, body.currency)

    return NextResponse.json({
      success: true,
      paymentIntent: paymentIntent
    })
  } catch (error) {
    console.error('Payment intent creation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 