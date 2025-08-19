import { test, expect } from '@playwright/test';

test('@smoke perf logs FCP (or app-fcp mark) and keeps trace', async ({ page }) => {
  const logs: string[] = [];
  page.on('console', (msg) => logs.push(msg.text()));

  await page.goto('/');
  await page.waitForLoadState('networkidle');

  // Read either native FCP log or app-fcp mark
  const fcpMark = await page.evaluate(() => {
    const m = performance.getEntriesByName('app-fcp').pop();
    return m ? Math.round((m as PerformanceEntry).startTime) : null;
  });

  const loggedFcp = logs.find(l => /^FCP:\s*\d+ms$/i.test(l));
  expect(fcpMark !== null || !!loggedFcp).toBeTruthy();

  // Tiny interaction to ensure trace has something meaningful
  await page.title();
});