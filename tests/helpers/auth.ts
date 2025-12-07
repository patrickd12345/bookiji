import { Page } from '@playwright/test'

export function authHelper(page: Page) {
  return {
    async login(email = 'test@example.com', password = 'password') {
      await page.goto('/login')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button:has-text("Log In")')
      await page.waitForURL('**/dashboard', { timeout: 8000 })
    }
  }
}
