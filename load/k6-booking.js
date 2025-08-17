import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  thresholds: {
    http_req_failed: ['rate<0.005'],         // <0.5% errors (99.5% success rate)
    http_req_duration: ['p(95)<700'],        // p95 < 700ms for API legs
    http_req_duration: ['p(99)<1200'],       // p99 < 1.2s for API legs
  },
  scenarios: {
    burst_then_hold: {
      executor: 'ramping-arrival-rate',
      startRate: 5,           // RPS
      timeUnit: '1s',
      preAllocatedVUs: 50,
      maxVUs: 200,
      stages: [
        { duration: '1m', target: 20 },      // ramp to 20 RPS
        { duration: '3m', target: 20 },      // hold
        { duration: '1m', target: 0 },       // ramp down
      ],
    },
  },
};

const BASE = __ENV.BASE_URL;
const HDRS = { 'Content-Type': 'application/json' };

// If you key the limiter by IP, this still exercises it meaningfully.
// If you have a test bypass for bookings, use it here.

export default function () {
  // 1) Create test pending booking (lightweight)
  const create = http.post(`${BASE}/api/bookings/create-test`, JSON.stringify({
    customer_name: 'k6 User',
    phone: '555-555-4242',
    service_id: __ENV.TEST_SERVICE_ID,
    slot_iso: new Date(Date.now() + 3600_000).toISOString(),
  }), { headers: HDRS });

  check(create, { 'create 200': r => r.status === 200 });
  const bookingId = create.json('bookingId');

  // 2) Hit create-payment-intent (the hot path)
  const cpi = http.post(`${BASE}/api/payments/create-payment-intent`,
    JSON.stringify({ amount_cents: 100, currency: 'usd', metadata: { bookingId } }),
    { headers: HDRS }
  );
  check(cpi, { 'cpi ok': r => r.status === 200 || r.status === 201 || r.status === 429 });

  sleep(0.2); // tiny think time
}
