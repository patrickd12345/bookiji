import { test, expect } from '@playwright/test'

test('vendor page has canonical to apex + noindex on non-prod + valid JSON-LD', async ({ page, request }) => {
  const slug = process.env.TEST_VENDOR_SLUG!
  await page.goto(`/vendor/${slug}`, { waitUntil: 'domcontentloaded' })

  // Canonical
  const canonical = await page.locator('link[rel="canonical"]').getAttribute('href')
  expect(canonical).toBeTruthy()
  const host = process.env.CANONICAL_HOST ?? 'bookiji.com'
  expect(canonical!).toContain(`https://${host}/vendor/${slug}`)
  // ensure no vercel.app domain leakage in canonical
  expect(canonical!).not.toMatch(/vercel\.app/i)

  // JSON-LD validity
  const jsonLdRaw = await page.locator('script[type="application/ld+json"][data-testid="vendor-jsonld"]').innerText()
  const jsonLd = JSON.parse(jsonLdRaw)
  expect(jsonLd['@context']).toBe('https://schema.org')
  expect(jsonLd['@type']).toBeTruthy()
  expect(jsonLd['url']).toContain(`https://${host}/vendor/${slug}`)
  expect(jsonLd['name']).toBeTruthy()

  // X-Robots-Tag on non-prod (skip if prod)
  const isProd = process.env.VERCEL_ENV === 'production'
  const resp = await request.get(`/vendor/${slug}`)
  if (!isProd) {
    const hdrs = resp.headers()
    const robots = hdrs['x-robots-tag'] || hdrs['X-Robots-Tag']
    expect(robots).toContain('noindex')
  }
})


