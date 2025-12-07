import { Page } from '@playwright/test'

export function authHelper(page: Page) {
  return {
    async login(email = 'test@example.com', password = 'password') {
      await page.goto('/login')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button:has-text("Log In")')
      await page.waitForURL('**/dashboard', { timeout: 8000 })
    },
    async loginAsAdmin(email = 'admin@bookiji.test', password = 'admin123') {
      await page.goto('/login')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button:has-text("Log In")')
      await page.waitForURL('**/admin/**', { timeout: 8000 })
    },
    async loginAsVendor(email = 'vendor@bookiji.test', password = 'vendor123') {
      await page.goto('/login')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button:has-text("Log In")')
      await page.waitForURL('**/vendor/**', { timeout: 8000 })
    },
    async loginAsCustomer(email = 'customer@bookiji.test', password = 'customer123') {
      await page.goto('/login')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button:has-text("Log In")')
      await page.waitForURL('**/dashboard', { timeout: 8000 })
    }
  }
}
