import { test, expect } from '@playwright/test'

test('main landmark and skip link exist', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' })
	await expect(page.getByRole('main')).toBeVisible()
	const skip = page.getByRole('link', { name: /skip to main/i })
	await expect(skip).toBeVisible()

	// Ensure skip link actually moves focus into the main region
	await skip.focus()
	await page.keyboard.press('Enter')
	const focusedInsideMain = await page.evaluate(() => {
		const main = document.querySelector('main,[role="main"]')
		return !!main && main.contains(document.activeElement)
	})
	expect(focusedInsideMain).toBe(true)
})


