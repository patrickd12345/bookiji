import { Page, APIRequestContext } from '@playwright/test'

export function emailHelper(page: Page, request: APIRequestContext) {
  return {
    async triggerForgotPassword(email = 'user@example.com') {
      await page.goto('/forgot-password')
      await page.fill('[data-test="forgot-email"]', email)
      await page.click('[data-test="forgot-submit"]')
      await page.waitForSelector('[data-test="forgot-success"]')
    },

    // if you expose a test-only mailbox endpoint, you can poll it here
    async expectMockEmailSent(email: string) {
      const resp = await request.get(`/api/test/emails?to=${encodeURIComponent(email)}`)
      const json = await resp.json()
      if (!Array.isArray(json) || json.length === 0) {
        throw new Error(`No mock email found for ${email}`)
      }
    },
  }
}







