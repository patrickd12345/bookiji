import { test, expect } from '../fixtures/base'

test('admin requires authentication', async ({ page }) => {
  await page.goto('/admin', { waitUntil: 'domcontentloaded' })

  const accessDenied = page.locator('text=Access Denied')
  const loginHeading = page.getByRole('heading', { name: /sign in to your account/i })
  const loginForm = page.locator('form')

  await expect(async () => {
    const deniedVisible = await accessDenied.isVisible().catch(() => false)
    const loginVisible = await loginHeading.isVisible().catch(() => false)
    const loginFormVisible = await loginForm.isVisible().catch(() => false)

    expect(deniedVisible || loginVisible || loginFormVisible).toBeTruthy()
  }).toPass({ timeout: 30_000 })
})
