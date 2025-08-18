import { test, expect } from '@playwright/test';

test('perf: homepage FCP & trace', async ({ page, context }) => {
  test.setTimeout(90_000);

  // Capture a trace for later inspection
  await context.tracing.start({ screenshots: true, snapshots: true, sources: true });

  await page.goto('http://localhost:3000', { waitUntil: 'load' });

  // Try to read First Contentful Paint (Chromium)
  const fcp = await page.evaluate(() => {
    const entries = performance.getEntriesByName('first-contentful-paint') as PerformanceEntry[];
    return entries?.[0]?.startTime ?? null;
  });

  // Basic sanity checks
  await expect(page).toHaveTitle(/bookiji/i);

  // Stop trace
  await context.tracing.stop({ path: 'trace.zip' });

  // Soft budget: FCP under 3000ms in CI; tweak as needed
  if (fcp !== null) {
    console.log(`FCP: ${Math.round(fcp)}ms`);
    expect(fcp).toBeLessThan(3000);
  } else {
    console.warn('FCP not available in this browser build; keeping test passing but trace captured.');
  }
});
