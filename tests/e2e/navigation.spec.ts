import { test, expect } from '../fixtures/base'

test('homepage loads', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('text=Bookiji')).toBeVisible()
})

test('help page loads', async ({ page }) => {
  await page.goto('/help')
  await expect(page.locator('h1')).toContainText('Help')
})
