import { test, expect, Page } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

export async function runAxeAndAttach(page: Page, label: string) {
  const results = await new AxeBuilder({ page })
    .include('main, [role="main"]')
    .exclude('ins.adsbygoogle, iframe[id^="google_ads_"], [data-dialog-root], [aria-hidden="true"]')
    .withTags(['wcag2a','wcag2aa'])
    .analyze();

  await test.info().attach(`axe-${label}.json`, {
    body: Buffer.from(JSON.stringify(results, null, 2)),
    contentType: 'application/json',
  });

  const bad = results.violations.filter(v => /serious|critical/i.test(v.impact ?? ''));
  if (bad.length) {
    // Note: page.accessibility.snapshot() was removed in newer Playwright versions
    // Using Axe results instead for accessibility tree information
    await test.info().attach(`ax-tree-${label}.json`, {
      body: Buffer.from(JSON.stringify(results, null, 2)),
      contentType: 'application/json',
    });
  }
  expect(bad, JSON.stringify(bad, null, 2)).toHaveLength(0);
}

