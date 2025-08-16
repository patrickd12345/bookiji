import { NextRequest, NextResponse } from 'next/server'
import { getStripeOrThrow } from '@/lib/stripe'
import { supabase } from '@/lib/supabaseClient'
import { trackPaymentSuccess, trackPaymentFailure, PaymentMetadata } from '@/lib/analytics'
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface PaymentIntentWithMetadata extends Stripe.PaymentIntent {
  metadata: {
    booking_id?: string;
  };
  charges?: {
    data?: Array<{
      billing_details?: {
        address?: {
          country?: string;
        };
      };
      payment_method_details?: {
        type?: string;
      };
    }>;
  };
}

export interface PaymentsWebhookResponse {
  received?: boolean
  error?: string
}

export interface PaymentsWebhookHandler {
  handle(request: NextRequest) : Promise<NextResponse<PaymentsWebhookResponse>>
}

export class PaymentsWebhookHandlerImpl implements PaymentsWebhookHandler {
  constructor(
    private getStripeOrThrow: () => Stripe,
    private supabase: SupabaseClient,
    private trackPaymentSuccess: (data: PaymentMetadata) => void,
    private trackPaymentFailure: (data: PaymentMetadata) => void
  ) {}

  async handle(request: NextRequest): Promise<NextResponse<PaymentsWebhookResponse>> {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    if (!signature) {
      return NextResponse.json({ error: 'No signature' }, { status: 400 })
    }

    let event: Stripe.Event
    try {
      const stripe = this.getStripeOrThrow()
      event = stripe.webhooks.constructEvent(
        body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET!
      )
    } catch (err: unknown) {
      console.error('Webhook signature verification failed:', err)
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
    }

    console.log('🎣 Webhook received:', event.type)

    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSucceeded(event.data.object as PaymentIntentWithMetadata)
          break
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailed(event.data.object as PaymentIntentWithMetadata)
          break
        case 'payment_intent.canceled':
          await this.handlePaymentCanceled(event.data.object as PaymentIntentWithMetadata)
          break
        default:
          console.log(`Unhandled event type: ${event.type}`)
      }

      return NextResponse.json({ received: true })
    } catch (error: unknown) {
      console.error('Webhook handler error:', error)
      return NextResponse.json({ error: 'Webhook handler failed' }, { status: 500 })
    }
  }

  private async handlePaymentSucceeded(paymentIntent: PaymentIntentWithMetadata): Promise<void> {
    const bookingId = paymentIntent.metadata?.booking_id
    
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata')
      return
    }

    console.log('✅ Payment succeeded for booking:', bookingId)

    // Update booking status to confirmed
    const { error } = await this.supabase
      .from('bookings')
      .update({ 
        status: 'confirmed',
        commitment_fee_paid: true,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking status:', error)
      return
    }

    this.trackPaymentSuccess({
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      country: paymentIntent.charges?.data?.[0]?.billing_details?.address?.country,
      paymentMethod: paymentIntent.charges?.data?.[0]?.payment_method_details?.type || paymentIntent.payment_method_types?.[0],
      bookingId
    })

    // Send notifications
    try {
      const baseUrl = process.env.NEXT_PUBLIC_BASE_URL 
        ? `https://${process.env.NEXT_PUBLIC_BASE_URL}` 
        : process.env.VERCEL_URL 
          ? `https://${process.env.VERCEL_URL}` 
          : '';

      if (!baseUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Missing baseUrl for notifications');
        }
        return;
      }

      // Send payment success notification to customer
      await fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_success',
          bookingId
        })
      })

      // Send booking confirmation to customer
      await fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_confirmation',
          bookingId
        })
      })

      // Send provider alert
      await fetch(`${baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'provider_alert',
          bookingId
        })
      })

      console.log('📧 All notifications sent for booking:', bookingId)
    } catch (notificationError) {
      console.error('Error sending notifications:', notificationError)
    }
  }

  private async handlePaymentFailed(paymentIntent: PaymentIntentWithMetadata): Promise<void> {
    const bookingId = paymentIntent.metadata?.booking_id
    
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata')
      return
    }

    console.log('❌ Payment failed for booking:', bookingId)

    // Update booking status to cancelled
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        commitment_fee_paid: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking status after payment failure:', error)
    }

    this.trackPaymentFailure({
      amount: paymentIntent.amount,
      currency: paymentIntent.currency,
      country: paymentIntent.charges?.data?.[0]?.billing_details?.address?.country,
      paymentMethod: paymentIntent.charges?.data?.[0]?.payment_method_details?.type || paymentIntent.payment_method_types?.[0],
      bookingId
    })
  }

  private async handlePaymentCanceled(paymentIntent: PaymentIntentWithMetadata): Promise<void> {
    const bookingId = paymentIntent.metadata?.booking_id
    
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata')
      return
    }

    console.log('🚫 Payment canceled for booking:', bookingId)

    // Update booking status to cancelled
    const { error } = await this.supabase
      .from('bookings')
      .update({
        status: 'cancelled',
        commitment_fee_paid: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', bookingId)

    if (error) {
      console.error('Error updating booking status after payment cancellation:', error)
    }
  }
}

export function createPaymentsWebhookHandler(): PaymentsWebhookHandler {
  return new PaymentsWebhookHandlerImpl(getStripeOrThrow, supabase, trackPaymentSuccess, trackPaymentFailure)
} 