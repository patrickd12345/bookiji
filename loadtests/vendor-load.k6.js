import http from 'k6/http'
import { check, sleep } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Ramp up to 20 vendors
    { duration: '1m', target: 20 },    // Stay at 20 vendors
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<500'],
    'errors': ['rate<0.01'],
    'http_req_failed': ['rate<0.01'],
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export default function () {
  // Simulate vendor operations
  const vendorFlow = [
    {
      name: 'Vendor Analytics',
      url: `${BASE_URL}/api/vendor/analytics`,
      method: 'GET',
    },
    {
      name: 'Vendor Settings',
      url: `${BASE_URL}/api/vendor/settings`,
      method: 'GET',
    },
    {
      name: 'Service Types',
      url: `${BASE_URL}/api/vendor/service-types`,
      method: 'GET',
    },
  ]

  for (const step of vendorFlow) {
    const params = {
      headers: {
        'Content-Type': 'application/json',
      },
    }

    const response = step.method === 'GET'
      ? http.get(step.url, params)
      : http.post(step.url, null, params)

    const success = check(response, {
      [`${step.name} status is 200 or 401`]: (r) => [200, 401].includes(r.status),
      [`${step.name} response time < 500ms`]: (r) => r.timings.duration < 500,
    })

    errorRate.add(!success)
    sleep(2) // Vendors update less frequently
  }
}




























