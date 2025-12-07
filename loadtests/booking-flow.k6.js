import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

// Custom metrics
const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'], // 95% of requests must complete below 500ms
    'errors': ['rate<0.01'],            // Error rate must be less than 1%
    'http_req_failed': ['rate<0.01'],  // HTTP failure rate < 1%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Simulate booking flow
  const bookingFlow = [
    // 1. Health check
    {
      name: 'Health Check',
      url: `${BASE_URL}/api/health`,
      method: 'GET',
    },
    // 2. Search providers (simulated)
    {
      name: 'Search Providers',
      url: `${BASE_URL}/api/search/providers`,
      method: 'GET',
    },
    // 3. Create booking (will fail without auth, but tests endpoint availability)
    {
      name: 'Create Booking',
      url: `${BASE_URL}/api/bookings/create`,
      method: 'POST',
      body: JSON.stringify({
        providerId: '00000000-0000-0000-0000-000000000000',
        serviceId: '00000000-0000-0000-0000-000000000000',
        startTime: '2025-12-31T10:00:00Z',
        endTime: '2025-12-31T11:00:00Z',
        amountUSD: 100,
      }),
    },
  ]

  for (const step of bookingFlow) {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    }

    let response
    if (step.method === 'GET') {
      response = http.get(step.url, params)
    } else {
      response = http.post(step.url, step.body, params)
    }

    const success = check(response, {
      [`${step.name} status is 200 or 401`]: (r) => [200, 401].includes(r.status),
      [`${step.name} response time < 500ms`]: (r) => r.timings.duration < 500,
    })

    errorRate.add(!success)

    sleep(1) // Think time between steps
  }
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'loadtest-results.json': JSON.stringify(data),
  }
}

function textSummary(data, options) {
  // Simple text summary
  return `
Load Test Summary:
  Total Requests: ${data.metrics.http_reqs.values.count}
  Error Rate: ${(data.metrics.http_req_failed.values.rate * 100).toFixed(2)}%
  P95 Latency: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms
  `
}

