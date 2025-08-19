import { test, expect } from '@playwright/test'

for (const path of ['/', '/vendor/onboarding']) {
	test(`exactly one <h1> on ${path}`, async ({ page }) => {
		await page.goto(path, { waitUntil: 'domcontentloaded' })
		const h1s = page.locator('h1')
		await expect(h1s).toHaveCount(1)
		await expect(h1s.first()).toBeVisible()
	})
}


