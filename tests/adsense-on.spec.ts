import { test, expect } from '@playwright/test'

function parseCsp(csp: string) {
	const out: Record<string, string[]> = {}
	for (const part of csp.split(';').map(s => s.trim()).filter(Boolean)) {
		const [dir, ...vals] = part.split(/\s+/)
		out[dir] = vals
	}
	return out
}

test('AdSense is present and CSP/nonce are correct (approval mode ON)', async ({ page, request }) => {
  // Navigate first so we can read headers from the same response used to render
  const nav = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(nav).toBeTruthy()
  const headers = nav!.headers()
  const cspHeader = (headers['content-security-policy'] ?? headers['Content-Security-Policy']) as string
  expect(cspHeader).toBeTruthy()
  const nonceHeader = (headers['x-nonce'] ?? headers['X-Nonce']) as string
  expect(nonceHeader).toBeTruthy()
  // No noindex header when hitting prod
  const xRobots = (headers['x-robots-tag'] ?? headers['X-Robots-Tag']) as string | undefined
  if (process.env.BASE_URL?.includes('bookiji.com')) {
    expect(xRobots).toBeUndefined()
  }

  const csp = parseCsp(String(cspHeader))
	const want: Record<string, string[]> = {
		'script-src': ['https://pagead2.googlesyndication.com', 'https://www.googletagservices.com', 'https://www.gstatic.com', 'https://www.google.com'],
		'img-src': ['https://pagead2.googlesyndication.com', 'https://tpc.googlesyndication.com', 'https://googleads.g.doubleclick.net'],
		'connect-src': ['https://pagead2.googlesyndication.com', 'https://googleads.g.doubleclick.net', 'https://adservice.google.com'],
		'frame-src': ['https://googleads.g.doubleclick.net', 'https://tpc.googlesyndication.com', 'https://www.google.com'],
	}

	for (const [dir, hosts] of Object.entries(want)) {
		const actual = csp[dir] ?? []
		for (const host of hosts) {
			expect(actual.join(' ')).toContain(host)
		}
	}

	const errors: string[] = []
	page.on('console', msg => {
		if (msg.type() === 'error' && /refused to load|content security policy/i.test(msg.text())) {
			errors.push(msg.text())
		}
	})

	const adsScript = page.locator('script[src*="pagead2.googlesyndication.com"]')
	await expect(adsScript).toHaveCount(1)
	const scriptNonce = await adsScript.first().getAttribute('nonce')
	expect(scriptNonce).toBe(nonceHeader)

	const client = process.env.NEXT_PUBLIC_ADSENSE_CLIENT!
	const slot = process.env.NEXT_PUBLIC_ADSENSE_SLOT!
	const ad = page.locator('ins.adsbygoogle')
	await expect(ad).toHaveCount(1)
	await expect(ad).toHaveAttribute('data-ad-client', client)
	await expect(ad).toHaveAttribute('data-ad-slot', slot)
	// CLS guard: reserve height >= 250
	const height = await ad.evaluate((el) => parseInt(getComputedStyle(el).minHeight || '0', 10))
	expect(height).toBeGreaterThanOrEqual(250)

	const hasAdsArray = await page.evaluate(() => Array.isArray((window as any).adsbygoogle))
	expect(hasAdsArray).toBeTruthy()

  const badInline = await page.$$eval('script:not([src])', ss => ss.filter(s => !s.getAttribute('nonce')).length)
  expect(badInline, 'Found inline <script> without nonce').toBe(0)

	const adsTxt = await request.get('/ads.txt')
	expect(adsTxt.ok()).toBeTruthy()
	const body = await adsTxt.text()
	expect(body).toMatch(/google\.com\s*,\s*pub-\d{16}/)

	expect(errors, `CSP console errors detected:\n${errors.join('\n')}`).toHaveLength(0)
})


