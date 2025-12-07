import { APIRequestContext } from '@playwright/test'

export function stripeHelper(request: APIRequestContext) {
  return {
    async triggerWebhook(intentId: string) {
      return request.post('http://localhost:3000/api/stripe/webhook', {
        headers: { 'stripe-signature': 'test_sig' },
        data: {
          type: 'payment_intent.succeeded',
          data: { object: { id: intentId } }
        }
      })
    }
  }
}
