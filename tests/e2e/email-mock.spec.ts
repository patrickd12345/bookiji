import { test, expect } from '../fixtures/base'

test('forgot password triggers mock email', async ({ page, email }) => {
  const recipient = 'user+forgot@example.com'

  await email.triggerForgotPassword(recipient)
  await email.expectMockEmailSent(recipient)

  await expect(page.locator('[data-test="forgot-success"]')).toBeVisible()
})


















