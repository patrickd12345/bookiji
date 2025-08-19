import { test, expect } from '@playwright/test'

// Force a fresh storage state for this suite to prevent bleed from project configs
test.use({ storageState: undefined })

test('Consent Mode flip grants without CSP errors', async ({ page }) => {
	const errs: string[] = []
	page.on('console', (m) => {
		if (m.type() !== 'error') return
		const t = m.text()
		if (/(csp|refused to load|cookie.*blocked)/i.test(t)) errs.push(t)
	})

	// Start clean
	await page.goto('/', { waitUntil: 'domcontentloaded' })

	// Skip when global kill is on
	test.skip(process.env.NEXT_PUBLIC_ADSENSE_GLOBAL_OFF === 'true')

	// Flip consent → granted
	await page.evaluate(() => {
			// @ts-expect-error - gtag is injected by Google Analytics
	window.gtag?.('consent', 'update', {
			ad_user_data: 'granted',
			ad_personalization: 'granted',
			ad_storage: 'granted',
			analytics_storage: 'granted',
		})
	})

	// AdSense queue should exist (no real render required)
	await expect.poll(() => page.evaluate(() => Array.isArray((window as any).adsbygoogle))).toBe(true)

	// No CSP/cookie errors logged
	expect(errs, `Errors seen:\n${errs.join('\n')}`).toHaveLength(0)

	// Reset consent/state to avoid leaking into other tests
	await page.evaluate(() => {
			// @ts-expect-error - gtag is injected by Google Analytics
	window.gtag?.('consent','update',{
			ad_user_data:'denied', ad_personalization:'denied',
			ad_storage:'denied', analytics_storage:'denied'
		});
		localStorage.clear(); sessionStorage.clear();
		document.cookie.split(';').forEach(c => {
			document.cookie = c.replace(/^ +/, '').replace(/=.*/, '=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/')
		});
	})
})


