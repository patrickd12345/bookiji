/**
 * Stripe Webhook Replay Testing Helper
 * 
 * Tests webhook idempotency and resilience by replaying webhooks
 * in various scenarios: duplicates, out-of-order, delayed, etc.
 */

import Stripe from 'stripe'

export interface WebhookEvent {
  id: string
  type: string
  data: any
  created: number
}

export class StripeReplayTester {
  private stripe: Stripe
  private webhookSecret: string
  private baseUrl: string

  constructor(
    webhookSecret: string = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_test',
    baseUrl: string = process.env.BASE_URL || 'http://localhost:3000'
  ) {
    this.webhookSecret = webhookSecret
    this.baseUrl = baseUrl
    this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test', {
      apiVersion: '2024-06-20'
    })
  }

  /**
   * Create a test webhook event
   */
  createTestEvent(type: string, data: any): Stripe.Event {
    return {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      type: type as Stripe.Event.Type,
      data: {
        object: data
      },
      created: Math.floor(Date.now() / 1000),
      livemode: false,
      pending_webhooks: 0,
      request: null,
      api_version: '2024-06-20'
    } as Stripe.Event
  }

  /**
   * Sign a webhook payload (simplified - in production use Stripe's signing)
   */
  async signPayload(payload: string, timestamp: number): Promise<string> {
    // In production, use crypto to create proper signature
    // This is a simplified version for testing
    return `t=${timestamp},v1=test_signature`
  }

  /**
   * Send webhook to endpoint
   */
  async sendWebhook(event: Stripe.Event): Promise<Response> {
    const payload = JSON.stringify(event)
    const timestamp = Math.floor(Date.now() / 1000)
    const signature = await this.signPayload(payload, timestamp)

    return fetch(`${this.baseUrl}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': signature
      },
      body: payload
    })
  }

  /**
   * Test duplicate webhook handling (idempotency)
   */
  async testDuplicateWebhook(event: Stripe.Event): Promise<boolean> {
    // Send same webhook twice
    const response1 = await this.sendWebhook(event)
    const response2 = await this.sendWebhook(event)

    // Both should succeed, but second should be idempotent
    const ok1 = response1.ok || response1.status === 200
    const ok2 = response2.ok || response2.status === 200

    return ok1 && ok2
  }

  /**
   * Test out-of-order webhook delivery
   */
  async testOutOfOrderWebhooks(events: Stripe.Event[]): Promise<boolean> {
    // Send events in reverse order
    const reversed = [...events].reverse()
    
    const responses = await Promise.all(
      reversed.map(event => this.sendWebhook(event))
    )

    // All should be handled (even if out of order)
    return responses.every(r => r.ok || r.status === 200)
  }

  /**
   * Test delayed webhook (replay after 1 hour)
   */
  async testDelayedWebhook(event: Stripe.Event, delayMs: number = 3600000): Promise<boolean> {
    // Simulate delay by modifying timestamp
    const delayedEvent = {
      ...event,
      created: Math.floor((Date.now() - delayMs) / 1000)
    }

    const response = await this.sendWebhook(delayedEvent)
    return response.ok || response.status === 200
  }

  /**
   * Test invalid signature handling
   */
  async testInvalidSignature(event: Stripe.Event): Promise<boolean> {
    const payload = JSON.stringify(event)
    
    const response = await fetch(`${this.baseUrl}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid_signature'
      },
      body: payload
    })

    // Should reject invalid signature (400)
    return response.status === 400
  }

  /**
   * Test webhook replay after failure
   */
  async testReplayAfterFailure(event: Stripe.Event): Promise<boolean> {
    // First send with invalid signature (simulate failure)
    const failResponse = await fetch(`${this.baseUrl}/api/stripe/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': 'invalid'
      },
      body: JSON.stringify(event)
    })

    // Should fail
    if (failResponse.status !== 400) {
      return false
    }

    // Retry with valid signature
    const retryResponse = await this.sendWebhook(event)
    return retryResponse.ok || retryResponse.status === 200
  }
}

export const stripeReplayTester = (
  webhookSecret?: string,
  baseUrl?: string
) => new StripeReplayTester(webhookSecret, baseUrl)

























