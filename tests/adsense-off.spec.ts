import { test, expect } from '@playwright/test'

test('AdSense is not present when approval mode OFF', async ({ page, request }) => {
	const res = await request.get('/')
	expect(res.ok()).toBeTruthy()

	await page.goto('/', { waitUntil: 'domcontentloaded' })

	await expect(page.locator('script[src*="pagead2.googlesyndication.com"]')).toHaveCount(0)
	await expect(page.locator('ins.adsbygoogle')).toHaveCount(0)

	// robots has Mediapartners allow
	const robots = await request.get('/robots.txt')
	expect(robots.ok()).toBeTruthy()
	const txt = await robots.text()
	expect(txt).toMatch(/User-agent:\s*Mediapartners-Google/i)
	expect(txt).toMatch(/Disallow:\s*$/m)

	// data-adtest must not be present in prod (hygiene)
	const maybeAttr = await page.locator('ins.adsbygoogle').first().getAttribute('data-adtest')
	expect(maybeAttr).toBeNull()
})


