import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '10s', target: 50 },  // Burst to 50 webhooks
    { duration: '5s', target: 0 },     // Immediate drop
  ],
  thresholds: {
    'http_req_duration': ['p(95)<1000'], // Webhooks can be slower
    'errors': ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const WEBHOOK_SECRET = __ENV.STRIPE_WEBHOOK_SECRET || 'whsec_test'

export default function () {
  // Simulate Stripe webhook events
  const webhookEvents = [
    {
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: `pi_test_${Math.random().toString(36).substr(2, 9)}`,
          amount: 10000,
          status: 'succeeded',
        },
      },
    },
    {
      type: 'payment_intent.payment_failed',
      data: {
        object: {
          id: `pi_test_${Math.random().toString(36).substr(2, 9)}`,
          status: 'requires_payment_method',
        },
      },
    },
  ]

  const event = webhookEvents[Math.floor(Math.random() * webhookEvents.length)]

  const response = http.post(
    `${BASE_URL}/api/stripe/webhook`,
    JSON.stringify(event),
    {
      headers: {
        'Content-Type': 'application/json',
        'stripe-signature': `t=${Date.now()},v1=test_signature`,
      },
    }
  )

  const success = check(response, {
    'webhook status is 200 or 400': (r) => [200, 400].includes(r.status),
    'webhook response time < 1000ms': (r) => r.timings.duration < 1000,
  })

  errorRate.add(!success)
  sleep(0.1) // Minimal sleep for burst testing
}



