import { test, expect } from '@playwright/test'

test('Global OFF kills AdSense everywhere and keeps layout stable', async ({ page }) => {
	// Expect env to be wired in CI: NEXT_PUBLIC_ADSENSE_GLOBAL_OFF=true
	await page.goto('/', { waitUntil: 'domcontentloaded' })
	await expect(page.locator('script[src*="pagead2.googlesyndication.com"]')).toHaveCount(0)
	await expect(page.locator('ins.adsbygoogle')).toHaveCount(0)
	// Placeholder present to preserve CLS
	const ph = page.locator('[data-testid="ads-placeholder"]')
	await expect(ph).toHaveCount(1)
	const height = await ph.evaluate((el) => parseInt(getComputedStyle(el).minHeight || '0', 10))
	expect(height).toBeGreaterThanOrEqual(250)
})


