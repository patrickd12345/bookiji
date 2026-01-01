import http from 'k6/http'
import { check } from 'k6'
import { Rate } from 'k6/metrics'

const errorRate = new Rate('errors')

const TARGET_VUS = parseInt(__ENV.VUS || '25', 10)

export const options = {
  stages: [
    { duration: '10s', target: TARGET_VUS },   // Ramp up to target VUs
    { duration: '30s', target: TARGET_VUS },   // Stay at target VUs
    { duration: '10s', target: 0 },            // Ramp down
  ],
  thresholds: {
    'http_req_duration': ['p(95)<10000'],     // P95 threshold (will record actual)
    'errors': ['rate<0.05'],                  // Error rate < 5%
    'http_req_failed': ['rate<0.05'],         // HTTP failure rate < 5%
  },
}

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'
const PARTNER_API_KEY = __ENV.PARTNER_API_KEY || 'test-partner-api-key-1767275933622'

export default function () {
  const url = `${BASE_URL}/api/search/providers`
  const params = {
    headers: {
      'Authorization': `Bearer ${PARTNER_API_KEY}`,
    },
  }

  const response = http.get(url, params)

  const success = check(response, {
    'status is 200': (r) => r.status === 200,
    'response is JSON': (r) => {
      try {
        JSON.parse(r.body)
        return true
      } catch {
        return false
      }
    },
  })

  errorRate.add(!success)
}

export function handleSummary(data) {
  return {
    'stdout': textSummary(data, { indent: ' ', enableColors: true }),
    'loadtest-results.json': JSON.stringify(data),
  }
}

function textSummary(data, options) {
  const p95 = data.metrics.http_req_duration.values['p(95)'] || 0
  const errorRate = (data.metrics.http_req_failed.values.rate * 100) || 0
  return `
Search Providers Load Test Summary:
  VUs: ${TARGET_VUS}
  Total Requests: ${data.metrics.http_reqs.values.count}
  Error Rate: ${errorRate.toFixed(2)}%
  P95 Latency: ${p95.toFixed(2)}ms
  `
}
