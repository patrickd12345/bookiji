import http from 'k6/http'
import { check, sleep } from 'k6'

export const options = {
  vus: 5,
  duration: '3m',
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1000'],
    http_req_failed: ['rate<0.01'], // Error rate < 1%
    'checks{type:admin_api}': ['rate>0.99'],
  },
}

export default function () {
  const params = { tags: { type: 'admin_api' } }
  
  // Test admin performance endpoint (will return 401/403 without auth, but we test response time)
  const perfRes = http.get(__ENV.API_BASE + '/api/admin/performance?timeRange=1h', params)
  
  check(perfRes, {
    'admin performance endpoint responds': r => r.status === 200 || r.status === 401 || r.status === 403,
    'admin performance response time < 500ms': r => r.timings.duration < 500,
  }, { type: 'admin_api' })

  // Test admin audit log endpoint
  const auditRes = http.get(__ENV.API_BASE + '/api/admin/audit-log?page=1&limit=10', params)
  
  check(auditRes, {
    'admin audit endpoint responds': r => r.status === 200 || r.status === 401 || r.status === 403,
    'admin audit response time < 500ms': r => r.timings.duration < 500,
  }, { type: 'admin_api' })

  // Test search API (critical path)
  const searchRes = http.get(__ENV.API_BASE + '/api/search/providers?lat=45.5&lng=-73.6&radius=15', params)
  
  check(searchRes, {
    'search endpoint responds': r => r.status === 200 || r.status === 401 || r.status === 403,
    'search response time < 500ms': r => r.timings.duration < 500,
  }, { type: 'admin_api' })

  sleep(Math.random() * 2 + 1) // 1-3 second random delay
}
