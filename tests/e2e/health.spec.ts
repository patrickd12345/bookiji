import { test, expect } from '@playwright/test';

test('health probe returns ok and DLQ count', async ({ page }) => {
  const resp = await page.request.get('/api/health');
  expect(resp.ok()).toBeTruthy();
  const json = await resp.json();
  // shape: { ok: true, dlqLast24h: number, rateLimiter: 'supabase' | 'memory', ... }
  expect(json.status).toBe('ok');
  expect(json).toHaveProperty('queue');
  expect(json).toHaveProperty('rateLimiter');
});
