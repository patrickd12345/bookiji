import { test, expect } from '../fixtures/base'

test.describe('mobile responsiveness', () => {
  test.use({ viewport: { width: 390, height: 844 } }) // iPhone 12-ish

  async function expectNoHorizontalOverflow(page: any) {
    // Give layout a moment to settle (fonts/layout effects).
    await page.waitForTimeout(250)
    const overflow = await page.evaluate(() => {
      const sw = document.documentElement.scrollWidth
      const iw = window.innerWidth
      return sw - iw
    })
    // Allow tiny rounding differences.
    expect(overflow).toBeLessThanOrEqual(2)
  }

  test('home page does not overflow horizontally', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toContainText('Bookiji', { timeout: 10_000 })
    await expectNoHorizontalOverflow(page)
  })

  test('help page does not overflow horizontally', async ({ page }) => {
    await page.goto('/help', { waitUntil: 'domcontentloaded' })
    await expect(page.locator('h1')).toContainText('Help')
    await expectNoHorizontalOverflow(page)
  })
})
