import { test, expect } from '@playwright/test'

test('active nav link exposes aria-current="page"', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' })
	const current = page.locator('nav a[aria-current="page"]')
	await expect(current).toHaveCount(1)
	await expect(current.first()).toBeVisible()
})


