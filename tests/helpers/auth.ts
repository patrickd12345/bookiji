import { Page } from '@playwright/test'

const DEFAULT_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@bookiji.test'
const DEFAULT_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'password123'
const DEFAULT_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'
const DEFAULT_VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || 'TestPassword123!'
const DEFAULT_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const DEFAULT_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

export function authHelper(page: Page) {
  const waitForPathnamePrefix = async (pathnamePrefix: string, timeoutMs = 60_000) => {
    const prefix = pathnamePrefix.startsWith('/') ? pathnamePrefix : `/${pathnamePrefix}`
    await page.waitForURL((url) => url.pathname.startsWith(prefix), { timeout: timeoutMs, waitUntil: 'domcontentloaded' })
  }

  const waitForSupabaseAuthCookie = async (timeoutMs = 30_000) => {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      const cookies = await page.context().cookies()
      const hasAuthCookie = cookies.some((c) => c.name.includes('sb-') && c.name.includes('auth-token'))
      if (hasAuthCookie) return
      await page.waitForTimeout(200)
    }
    throw new Error('Timed out waiting for Supabase auth cookie to be set')
  }

  return {
    async login(email = DEFAULT_CUSTOMER_EMAIL, password = DEFAULT_CUSTOMER_PASSWORD) {
      await page.goto('/login?next=/customer/dashboard')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      await waitForPathnamePrefix('/customer/')
      await waitForSupabaseAuthCookie()
    },
    async loginAsAdmin(email = DEFAULT_ADMIN_EMAIL, password = DEFAULT_ADMIN_PASSWORD) {
      await page.goto('/login?next=/admin')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      await waitForPathnamePrefix('/admin')
      await waitForSupabaseAuthCookie()

      const adminCheck = await page.request.get('/api/auth/check-admin')
      if (!adminCheck.ok()) {
        throw new Error(`Admin check failed: ${adminCheck.status()}`)
      }
      const { isAdmin } = await adminCheck.json().catch(() => ({ isAdmin: false }))
      if (!isAdmin) {
        throw new Error('Logged in user is not recognized as admin')
      }
    },
    async loginAsVendor(email = DEFAULT_VENDOR_EMAIL, password = DEFAULT_VENDOR_PASSWORD, nextPath = '/vendor/dashboard') {
      await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      await waitForPathnamePrefix(nextPath.split('?')[0] || '/vendor/')
      await waitForSupabaseAuthCookie()
    },
    async loginAsCustomer(email = DEFAULT_CUSTOMER_EMAIL, password = DEFAULT_CUSTOMER_PASSWORD, nextPath = '/customer/dashboard') {
      await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      await waitForPathnamePrefix(nextPath.split('?')[0] || '/customer/')
      await waitForSupabaseAuthCookie()
    }
  }
}
