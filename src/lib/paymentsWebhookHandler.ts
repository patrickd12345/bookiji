import { NextRequest, NextResponse } from 'next/server'
import { getStripeOrThrow } from '@/lib/stripe'
import { getServerSupabase } from '@/lib/supabaseServer'
import { logger } from '@/lib/logger'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const supabase = new Proxy({} as any, { get: (target, prop) => (getServerSupabase() as any)[prop] }) as ReturnType<typeof getServerSupabase>
import { trackPaymentSuccess, trackPaymentFailure, PaymentMetadata } from '@/lib/analytics'
import Stripe from 'stripe'
import type { SupabaseClient } from '@supabase/supabase-js'

// Robust base URL for internal server-to-server calls
const __rawBase = process.env.NEXT_PUBLIC_BASE_URL || process.env.VERCEL_URL || ''
const __baseUrl = __rawBase
  ? (__rawBase.startsWith('http') ? __rawBase : `https://${__rawBase}`)
  : ''

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

  private async wasEventProcessed(eventId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('processed_webhook_events')
      .select('event_id')
      .eq('event_id', eventId)
      .maybeSingle()
    if (error) {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Idempotency check failed (non-fatal):', error)
      }
      return false
    }
    return !!data
  }

  private async markEventProcessed(eventId: string): Promise<void> {
    await this.supabase
      .from('processed_webhook_events')
      .insert({ event_id: eventId, processed_at: new Date().toISOString() })
      .then(({ error }) => {
        if (error && process.env.NODE_ENV === 'development') {
          console.warn('Failed to mark event processed (non-fatal):', error)
        }
      })
  }

  async handle(request: NextRequest): Promise<NextResponse<PaymentsWebhookResponse>> {
    const body = await request.text()
    const signature = request.headers.get('stripe-signature')

    // Test bypass logic for unsigned webhook events
    if (process.env.ENABLE_TEST_WEBHOOK_BYPASS === 'true') {
      const testKey = request.headers.get('x-test-webhook-key')
      if (testKey === process.env.TEST_WEBHOOK_KEY) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const event = JSON.parse(body) as any
          
          // Check for duplicate events
          if (await this.wasEventProcessed(event.id)) {
            return NextResponse.json({ received: true, duplicate: true })
          }

          // Handle test events
          switch (event.type) {
            case 'payment_intent.succeeded':
              if (event.data?.object?.metadata?.booking_id) {
                await this.handlePaymentSucceeded(event.data.object as PaymentIntentWithMetadata)
              }
              break
            case 'payment_intent.payment_failed':
              if (event.data?.object?.metadata?.booking_id) {
                await this.handlePaymentFailed(event.data.object as PaymentIntentWithMetadata)
              }
              break
            case 'payment_intent.canceled':
              if (event.data?.object?.metadata?.booking_id) {
                await this.handlePaymentCanceled(event.data.object as PaymentIntentWithMetadata)
              }
              break
            default:
              // Unhandled event types are ignored in test mode
              break
          }

          await this.markEventProcessed(event.id)
          return NextResponse.json({ received: true })
        } catch (error) {
          console.error('Test webhook handler error:', error)
          return NextResponse.json({ error: 'Test webhook handler failed' }, { status: 500 })
        }
      }
    }

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

    if (process.env.NODE_ENV === 'development') {
      logger.debug('🎣 Webhook received:', { eventType: event.type })
    }

    try {
      // Idempotency: avoid reprocessing the same event
      if (await this.wasEventProcessed(event.id)) {
        if (process.env.NODE_ENV === 'development') {
          console.log('Skipping already-processed event:', event.id)
        }
        return NextResponse.json({ received: true })
      }

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
          if (process.env.NODE_ENV === 'development') {
            console.log(`Unhandled event type: ${event.type}`)
          }
      }

      await this.markEventProcessed(event.id)
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

    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Payment succeeded for booking:', bookingId)
    }

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
      if (!__baseUrl) {
        if (process.env.NODE_ENV === 'development') {
          console.warn('⚠️ Missing base URL for notifications (NEXT_PUBLIC_BASE_URL or VERCEL_URL)')
        }
        return
      }

      // Send payment success notification to customer
      await fetch(`${__baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'payment_success',
          bookingId
        })
      })

      // Send booking confirmation to customer
      await fetch(`${__baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'booking_confirmation',
          bookingId
        })
      })

      // Send provider alert
      await fetch(`${__baseUrl}/api/notifications/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'provider_alert',
          bookingId
        })
      })

      if (process.env.NODE_ENV === 'development') {
        console.log('📧 All notifications sent for booking:', bookingId)
      }
    } catch (notificationError) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Error sending notifications:', notificationError)
      }
    }
  }

  private async handlePaymentFailed(paymentIntent: PaymentIntentWithMetadata): Promise<void> {
    const bookingId = paymentIntent.metadata?.booking_id
    
    if (!bookingId) {
      console.error('No booking ID in payment intent metadata')
      return
    }

    if (process.env.NODE_ENV === 'development') {
      console.log('❌ Payment failed for booking:', bookingId)
    }

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

    if (process.env.NODE_ENV === 'development') {
      console.log('🚫 Payment canceled for booking:', bookingId)
    }

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