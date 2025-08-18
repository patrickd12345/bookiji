import { test, expect } from '@playwright/test'

test('homepage loads', async ({ page }) => {
  await page.goto('http://localhost:3000')
  await expect(page).toHaveTitle(/Bookiji/i)
})

test('basic navigation works', async ({ page }) => {
  await page.goto('http://localhost:3000')
  
  // Check that the page loads without errors
  await expect(page.locator('body')).toBeVisible()
  
  // Verify some basic elements are present
  const title = page.locator('h1, [role="heading"]').first()
  await expect(title).toBeVisible()
})
