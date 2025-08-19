import { test, expect } from '@playwright/test'

test('homepage exposes Organization + WebSite JSON-LD with canonical host', async ({ page }) => {
  const host = process.env.CANONICAL_HOST ?? 'bookiji.com'
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  const raw = await page.locator('script[type="application/ld+json"][data-testid="site-jsonld"]').first().innerText()
  const arr = JSON.parse(raw)
  const byId: Record<string, any> = Object.fromEntries(arr.map((o: any) => [o['@id'], o]))

  expect(byId[`https://${host}#org`]['@type']).toBe('Organization')
  expect(byId[`https://${host}#website`]['@type']).toBe('WebSite')
  expect(byId[`https://${host}#website`]['url']).toBe(`https://${host}`)
  // Logo sanity check: absolute HTTPS URL to an image
  expect(byId[`https://${host}#org`].logo).toMatch(/^https:\/\/.+\.(png|jpg|jpeg|svg)$/i)
})


