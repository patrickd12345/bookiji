import { test, expect } from '@playwright/test'

test('vendor JSON-LD parses with correct @id and canonical url', async ({ page }) => {
  const slug = process.env.TEST_VENDOR_SLUG || 'demo-vendor'
  await page.goto(`/vendor/${slug}`, { waitUntil: 'domcontentloaded' })

  const raw = await page.locator('script[type="application/ld+json"][data-testid="vendor-jsonld"]').first().innerText()
  const json = JSON.parse(raw)
  const host = process.env.CANONICAL_HOST ?? 'bookiji.com'

  expect(json['@context']).toBe('https://schema.org')
  expect(json['@type']).toBeDefined()
  expect(json['@id']).toBe(`https://${host}/vendor/${slug}#identity`)
  expect(json['url']).toBe(`https://${host}/vendor/${slug}`)
})


