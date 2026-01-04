import { NextRequest, NextResponse } from 'next/server'
import { createCommitmentFeePaymentIntent } from '@/lib/stripe'
import Stripe from 'stripe'
import { insertLedgerEntry } from './credits/ledger'
import { insertPaymentIntent, updateStatus } from './payments/repository'
import { randomUUID } from 'crypto'

export interface PaymentIntentRequest {
  amount: number
  currency: string
  customerId: string
  serviceId: string
  bookingId?: string
  owner_type?: 'customer' | 'provider'
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
    private createCommitmentFeePaymentIntent: (amount: number, currency?: string, idempotencyKey?: string) => Promise<Stripe.PaymentIntent>
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

      const ownerType = body.owner_type || 'customer'
      const amountCents = Math.round(body.amount * 100) // Convert to cents
      const idempotencyKey = `payment-${body.bookingId || body.customerId}-${Date.now()}`

      // Step 1: Create credit_intent_id and ledger entry
      const creditIntentId = randomUUID()
      const ledgerResult = await insertLedgerEntry({
        owner_type: ownerType,
        owner_id: body.customerId,
        booking_id: body.bookingId,
        credit_intent_id: creditIntentId,
        amount_cents: -amountCents, // Negative for payment (debit)
        currency: body.currency.toUpperCase(),
        reason_code: 'redeemed',
        metadata: {
          service_id: body.serviceId,
          booking_id: body.bookingId,
        },
      })

      if (!ledgerResult.success) {
        return NextResponse.json(
          { error: `Failed to create ledger entry: ${ledgerResult.error}`, success: false },
          { status: 500 }
        )
      }

      // Step 2: Persist PaymentIntent with status 'created'
      const paymentIntentResult = await insertPaymentIntent({
        owner_type: ownerType,
        owner_id: body.customerId,
        booking_id: body.bookingId,
        credit_intent_id: creditIntentId,
        amount_cents: amountCents,
        currency: body.currency.toUpperCase(),
        external_provider: 'stripe',
        idempotency_key: idempotencyKey,
        metadata: {
          service_id: body.serviceId,
        },
      })

      if (!paymentIntentResult.success || !paymentIntentResult.paymentIntent) {
        return NextResponse.json(
          { error: `Failed to create PaymentIntent: ${paymentIntentResult.error}`, success: false },
          { status: 500 }
        )
      }

      const dbPaymentIntent = paymentIntentResult.paymentIntent

      // Step 3: Call Stripe with same idempotency key
      let stripePaymentIntent: Stripe.PaymentIntent
      try {
        stripePaymentIntent = await this.createCommitmentFeePaymentIntent(
          body.amount,
          body.currency,
          idempotencyKey
        )
      } catch (stripeError: any) {
        // Update PaymentIntent to 'failed' status
        await updateStatus(dbPaymentIntent.id, 'failed', {
          metadata: { stripe_error: stripeError.message },
        })
        return NextResponse.json(
          { error: `Stripe error: ${stripeError.message}`, success: false },
          { status: 500 }
        )
      }

      // Step 4: Update PaymentIntent with external_id and status
      const updateResult = await updateStatus(dbPaymentIntent.id, 'authorized', {
        external_id: stripePaymentIntent.id,
        external_provider: 'stripe',
        metadata: {
          stripe_payment_intent_id: stripePaymentIntent.id,
          stripe_status: stripePaymentIntent.status,
        },
      })

      if (!updateResult.success) {
        console.error('Failed to update PaymentIntent after Stripe call:', updateResult.error)
        // Don't fail the request - Stripe intent was created successfully
      }

      return NextResponse.json({
        success: true,
        paymentIntent: stripePaymentIntent
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