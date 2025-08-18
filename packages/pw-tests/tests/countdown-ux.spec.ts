import { test, expect } from '@playwright/test'

/**
 * This assumes your Booking page renders a Reschedule button that triggers the hold UI.
 * Adjust the route and selectors to your app.
 */

test('countdown shows, ticks, and auto-restores on expiry', async ({ page }) => {
  const bookingUrl = `/book/${process.env.BOOKING_ID}`
  await page.goto(bookingUrl)

  // Start reschedule via UI button
  await page.getByRole('button', { name: /Reschedule/i }).click()

  // Countdown appears
  const timer = page.getByTestId('reschedule-countdown')
  await expect(timer).toBeVisible()

  // It should tick down over time (watch text change)
  const initial = await timer.textContent()
  await page.waitForTimeout(1500)
  const later = await timer.textContent()
  expect(initial).not.toEqual(later)

  // Simulate expiry by waiting TTL+buffer (set TTL short in env for CI)
  await page.waitForFunction(() => {
    const el = document.querySelector('[data-testid="reschedule-countdown"]')
    return !el
  }, { timeout: 30_000 })

  // UI should reflect restore state (button present again, no hold banner)
  await expect(page.getByRole('button', { name: /Reschedule/i })).toBeEnabled()
  const banners = await page.locator('[data-testid="hold-banner"]').count()
  expect(banners).toBe(0)
})
