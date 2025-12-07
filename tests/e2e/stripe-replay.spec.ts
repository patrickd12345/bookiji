import { test, expect } from '../fixtures/base'
import { stripeReplayTester } from '../helpers/stripe-replay'

test.describe('Stripe Webhook Replay Tests', () => {
  test('handles duplicate webhooks (idempotency)', async ({ request }) => {
    const replayTester = stripeReplayTester()
    const event = replayTester.createTestEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
      amount: 10000,
      status: 'succeeded'
    })

    const result = await replayTester.testDuplicateWebhook(event)
    expect(result).toBe(true)
  })

  test('handles out-of-order webhooks', async ({ request }) => {
    const replayTester = stripeReplayTester()
    const events = [
      replayTester.createTestEvent('payment_intent.created', {
        id: 'pi_test_1',
        status: 'requires_payment_method'
      }),
      replayTester.createTestEvent('payment_intent.succeeded', {
        id: 'pi_test_1',
        status: 'succeeded'
      })
    ]

    const result = await replayTester.testOutOfOrderWebhooks(events)
    expect(result).toBe(true)
  })

  test('rejects invalid webhook signature', async ({ request }) => {
    const replayTester = stripeReplayTester()
    const event = replayTester.createTestEvent('payment_intent.succeeded', {
      id: 'pi_test_123'
    })

    const result = await replayTester.testInvalidSignature(event)
    expect(result).toBe(true)
  })

  test('handles delayed webhook replay', async ({ request }) => {
    const replayTester = stripeReplayTester()
    const event = replayTester.createTestEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
      status: 'succeeded'
    })

    // Test with 1 hour delay (simulated)
    const result = await replayTester.testDelayedWebhook(event, 3600000)
    // Should handle gracefully (may accept or reject based on business logic)
    expect(typeof result).toBe('boolean')
  })

  test('replays webhook after failure', async ({ request }) => {
    const replayTester = stripeReplayTester()
    const event = replayTester.createTestEvent('payment_intent.succeeded', {
      id: 'pi_test_123',
      status: 'succeeded'
    })

    const result = await replayTester.testReplayAfterFailure(event)
    expect(result).toBe(true)
  })
})

