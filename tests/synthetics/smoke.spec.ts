import { test, expect } from '@playwright/test';

// sanity probe - proves PW's expect is live
test('runner sanity', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/.+/);        // web assertion attached
  await expect(page).not.toHaveTitle('nope');  // proves PW's expect is live
});

test('health endpoint 200', async ({ request }) => {
  const res = await request.get('/api/health');
  expect(res.status()).toBe(200);
  expect(res.ok()).toBeTruthy();
});

test('home under 800ms', async ({ page }) => {
  const t0 = Date.now();
  await page.goto('/', { waitUntil: 'networkidle' });
  const dur = Date.now() - t0;
  test.info().annotations.push({ type: 'perf', description: `${dur}ms` });
  expect(dur).toBeLessThan(800);
});

