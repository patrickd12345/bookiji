// Minimal Playwright E2E sketch invoking API routes
import { test, expect, request } from '@playwright/test';

test('happy path booking', async ({ request }) => {
  const q = await request.post('/api/quote', {
    data: { intent: 'haircut', location: { lat: 45.5, lon: -73.6 } }
  });
  const qj = await q.json();
  expect(qj.ok).toBeTruthy();
  const provider = qj.data.candidates[0].provider_id;
  const confirm = await request.post('/api/bookings/confirm', {
    data: { quote_id: qj.data.quote_id, provider_id: provider, idempotency_key: 'abc123', stripe_payment_intent_id: 'pi_test' }
  });
  const cj = await confirm.json();
  expect(cj.ok).toBeTruthy();
});
