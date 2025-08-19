import { test, expect } from '@playwright/test'

test('Tab focuses the skip link first, and it moves focus to main', async ({ page }) => {
	await page.goto('/', { waitUntil: 'domcontentloaded' })
	// First Tab should land on the skip link (assuming no earlier focusables)
	await page.keyboard.press('Tab')
	const activeText = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.innerText || '')
	expect(activeText.toLowerCase()).toContain('skip to main')

	// Activate and ensure focus lands inside <main id="main">
	await page.keyboard.press('Enter')
	const focusedInMain = await page.evaluate(() => {
		const main = document.getElementById('main')
		return main ? main.contains(document.activeElement) : false
	})
	expect(focusedInMain).toBe(true)
})


