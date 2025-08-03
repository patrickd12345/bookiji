import { NextRequest, NextResponse } from 'next/server'
import { createCommitmentFeePaymentIntent } from './stripe'
import Stripe from 'stripe'

export interface PaymentIntentRequest {
  amount: number
  currency: string
  customerId: string
  serviceId: string
  bookingId?: string
}

export interface PaymentIntentResponse {
  success: boolean
  paymentIntent?: Stripe.PaymentIntent
  error?: string
}

export interface PaymentsCreateIntentHandler {
  handle(request: NextRequest): Promise<NextResponse<PaymentIntentResponse>>
}

export class PaymentsCreateIntentHandlerImpl implements PaymentsCreateIntentHandler {
  constructor(
    private createCommitmentFeePaymentIntent: (amount: number, currency?: string) => Promise<Stripe.PaymentIntent>
  ) {}

  async handle(request: NextRequest): Promise<NextResponse<PaymentIntentResponse>> {
    try {
      const body: PaymentIntentRequest = await request.json()
      
      // Validate required fields
      if (!body.amount || !body.currency || !body.customerId || !body.serviceId) {
        return NextResponse.json(
          { error: 'Missing required fields', success: false },
          { status: 400 }
        )
      }

      // Create payment intent with proper parameters
      const paymentIntent = await this.createCommitmentFeePaymentIntent(body.amount, body.currency)

      return NextResponse.json({
        success: true,
        paymentIntent: paymentIntent
      })
    } catch (error: unknown) {
      console.error('Payment intent creation error:', error)
      return NextResponse.json(
        { error: 'Internal server error', success: false },
        { status: 500 }
      )
    }
  }
}

export function createPaymentsCreateIntentHandler(): PaymentsCreateIntentHandler {
  return new PaymentsCreateIntentHandlerImpl(createCommitmentFeePaymentIntent)
} 