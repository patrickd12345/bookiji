import { test, expect } from '../fixtures/base'

test.skip(process.env.E2E_EMAIL_MOCK !== 'true', 'Mock email tests require E2E_EMAIL_MOCK=true and test email endpoints.')

test('forgot password triggers mock email', async ({ page, email }) => {
  const recipient = 'user+forgot@example.com'

  await email.triggerForgotPassword(recipient)
  await email.expectMockEmailSent(recipient)

  await expect(page.locator('[data-test="forgot-success"]')).toBeVisible()
})



























