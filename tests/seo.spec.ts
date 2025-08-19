import { test, expect } from '@playwright/test'

test('sitemap.xml is reachable and includes canonical URLs', async ({ request, baseURL }) => {
  const resp = await request.get('/sitemap.xml')
  expect(resp.ok()).toBeTruthy()

  const xml = await resp.text()
  // sanity checks
  expect(xml).toMatch(/<urlset/)
  expect(xml).toMatch(new RegExp(`${baseURL?.replace(/https?:\/\//, '')}`, 'i'))
  // at least one <loc>
  expect(xml).toMatch(/<loc>https?:\/\/.+?<\/loc>/)
})

test('vendor page exposes valid JSON-LD', async ({ page }) => {
  const slug = process.env.TEST_VENDOR_SLUG || 'demo-vendor'
  await page.goto(`/vendor/${slug}`, { waitUntil: 'domcontentloaded' })

  const ldJson = await page.$$eval('script[type="application/ld+json"]', nodes =>
    nodes.map(n => n.textContent || '').join('\n')
  )
  expect(ldJson).toBeTruthy()

  // parse and assert minimal shape for LocalBusiness/Service
  const blobs = ldJson.split('\n').map(s => s.trim()).filter(Boolean)
  const parsed = blobs.flatMap(b => {
    try { return [JSON.parse(b)] } catch { return [] }
  })

  const hasLocalBusiness = parsed.some((obj: any) =>
    obj['@type']?.toString().toLowerCase().includes('localbusiness') ||
    obj['@type']?.toString().toLowerCase().includes('service')
  )
  expect(hasLocalBusiness).toBeTruthy()

  // spot-check a few fields
  const anyObj: any = parsed.find((o: any) => (o && (o.name || o.areaServed || o.telephone))) || {}
  expect(anyObj.name).toBeTruthy()
})


