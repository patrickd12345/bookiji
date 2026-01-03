import { Page } from '@playwright/test'
import { ensureCustomerUser, ensureVendorUser, ensureAdminUser } from './ensureUser'

const DEFAULT_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@bookiji.test'
const DEFAULT_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'password123'
const DEFAULT_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'
const DEFAULT_VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || 'password123'
const DEFAULT_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const DEFAULT_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

export function authHelper(page: Page) {
  const hasAdminKey = Boolean(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY)

  const waitForPathnamePrefix = async (pathnamePrefix: string, timeoutMs = 30_000) => {
    const prefix = pathnamePrefix.startsWith('/') ? pathnamePrefix : `/${pathnamePrefix}`
    await page.waitForURL((url) => url.pathname.startsWith(prefix), { timeout: timeoutMs, waitUntil: 'domcontentloaded' })
  }

  const waitForSupabaseAuthCookie = async (timeoutMs = 15_000) => {
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
      // Ensure user exists before attempting login
      if (email === DEFAULT_CUSTOMER_EMAIL && hasAdminKey) {
        try {
          await ensureCustomerUser()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          throw new Error(
            `Cannot login: User ${email} does not exist and could not be created.\n` +
            `${errorMsg}\n` +
            `\n` +
            `To fix:\n` +
            `  1. Run: pnpm e2e:seed (to seed users before tests)\n` +
            `  2. Or: Start Supabase and ensure users are seeded\n` +
            `  3. Or: Check SUPABASE_URL and SUPABASE_SECRET_KEY are set correctly`
          )
        }
      }

      await page.goto('/login?next=/customer/dashboard')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      
      // Check for login errors
      const url = page.url()
      if (url.includes('/login') && !url.includes('next=')) {
        // Still on login page - check for error messages
        const errorText = await page.locator('text=/invalid|incorrect|error|failed/i').first().textContent().catch(() => null)
        if (errorText) {
          throw new Error(
            `Login failed for ${email}: ${errorText}\n` +
            `\n` +
            `This usually means:\n` +
            `  1. User does not exist (run: pnpm e2e:seed)\n` +
            `  2. Password is incorrect\n` +
            `  3. User account is not confirmed\n` +
            `\n` +
            `To fix:\n` +
            `  - Run: pnpm e2e:seed (to create/update test users)\n` +
            `  - Or: Check that Supabase is running and users are seeded`
          )
        }
      }

      await waitForPathnamePrefix('/customer/')
      await waitForSupabaseAuthCookie()
    },
    async loginAsAdmin(email = DEFAULT_ADMIN_EMAIL, password = DEFAULT_ADMIN_PASSWORD) {
      // Ensure user exists before attempting login
      if (email === DEFAULT_ADMIN_EMAIL && hasAdminKey) {
        try {
          await ensureAdminUser()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          throw new Error(
            `Cannot login as admin: User ${email} does not exist and could not be created.\n` +
            `${errorMsg}\n` +
            `\n` +
            `To fix:\n` +
            `  1. Run: CREATE_ADMIN=true pnpm e2e:seed (to seed admin user)\n` +
            `  2. Or: Start Supabase and ensure admin user is seeded\n` +
            `  3. Or: Check SUPABASE_URL and SUPABASE_SECRET_KEY are set correctly`
          )
        }
      }

      await page.goto('/login?next=/admin')
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      
      // Check for login errors
      const url = page.url()
      if (url.includes('/login') && !url.includes('next=')) {
        const errorText = await page.locator('text=/invalid|incorrect|error|failed/i').first().textContent().catch(() => null)
        if (errorText) {
          throw new Error(
            `Admin login failed for ${email}: ${errorText}\n` +
            `\n` +
            `This usually means:\n` +
            `  1. Admin user does not exist (run: CREATE_ADMIN=true pnpm e2e:seed)\n` +
            `  2. Password is incorrect\n` +
            `  3. User account is not confirmed\n` +
            `\n` +
            `To fix:\n` +
            `  - Run: CREATE_ADMIN=true pnpm e2e:seed (to create/update admin user)\n` +
            `  - Or: Check that Supabase is running and admin user is seeded`
          )
        }
      }

      await waitForPathnamePrefix('/admin')
      await waitForSupabaseAuthCookie()

      const adminCheck = await page.request.get('/api/auth/check-admin')
      if (!adminCheck.ok()) {
        throw new Error(
          `Admin check failed: ${adminCheck.status()}\n` +
          `\n` +
          `This usually means the user is not recognized as an admin.\n` +
          `Ensure the user has the 'admin' role in the user_roles table.`
        )
      }
      const { isAdmin } = await adminCheck.json().catch(() => ({ isAdmin: false }))
      if (!isAdmin) {
        throw new Error(
          `Logged in user is not recognized as admin.\n` +
          `\n` +
          `User ${email} exists but does not have admin privileges.\n` +
          `Ensure the user has the 'admin' role in the user_roles table.\n` +
          `Run: CREATE_ADMIN=true pnpm e2e:seed to create a proper admin user.`
        )
      }
    },
    async loginAsVendor(email = DEFAULT_VENDOR_EMAIL, password = DEFAULT_VENDOR_PASSWORD, nextPath = '/vendor/dashboard') {
      // Ensure user exists before attempting login
      if (email === DEFAULT_VENDOR_EMAIL && hasAdminKey) {
        try {
          await ensureVendorUser()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          throw new Error(
            `Cannot login as vendor: User ${email} does not exist and could not be created.\n` +
            `${errorMsg}\n` +
            `\n` +
            `To fix:\n` +
            `  1. Run: pnpm e2e:seed (to seed users before tests)\n` +
            `  2. Or: Start Supabase and ensure users are seeded\n` +
            `  3. Or: Check SUPABASE_URL and SUPABASE_SECRET_KEY are set correctly`
          )
        }
      }

      await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      
      // Check for login errors
      const url = page.url()
      if (url.includes('/login') && !url.includes('next=')) {
        const errorText = await page.locator('text=/invalid|incorrect|error|failed/i').first().textContent().catch(() => null)
        if (errorText) {
          throw new Error(
            `Vendor login failed for ${email}: ${errorText}\n` +
            `\n` +
            `This usually means:\n` +
            `  1. Vendor user does not exist (run: pnpm e2e:seed)\n` +
            `  2. Password is incorrect\n` +
            `  3. User account is not confirmed\n` +
            `\n` +
            `To fix:\n` +
            `  - Run: pnpm e2e:seed (to create/update test users)\n` +
            `  - Or: Check that Supabase is running and users are seeded`
          )
        }
      }

      await waitForPathnamePrefix(nextPath.split('?')[0] || '/vendor/')
      await waitForSupabaseAuthCookie()
    },
    async loginAsCustomer(email = DEFAULT_CUSTOMER_EMAIL, password = DEFAULT_CUSTOMER_PASSWORD, nextPath = '/customer/dashboard') {
      // Ensure user exists before attempting login
      if (email === DEFAULT_CUSTOMER_EMAIL && hasAdminKey) {
        try {
          await ensureCustomerUser()
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          throw new Error(
            `Cannot login as customer: User ${email} does not exist and could not be created.\n` +
            `${errorMsg}\n` +
            `\n` +
            `To fix:\n` +
            `  1. Run: pnpm e2e:seed (to seed users before tests)\n` +
            `  2. Or: Start Supabase and ensure users are seeded\n` +
            `  3. Or: Check SUPABASE_URL and SUPABASE_SECRET_KEY are set correctly`
          )
        }
      }

      await page.goto(`/login?next=${encodeURIComponent(nextPath)}`)
      await page.fill('input[name=email]', email)
      await page.fill('input[name=password]', password)
      await page.click('button[type="submit"]')
      
      // Check for login errors
      const url = page.url()
      if (url.includes('/login') && !url.includes('next=')) {
        const errorText = await page.locator('text=/invalid|incorrect|error|failed/i').first().textContent().catch(() => null)
        if (errorText) {
          throw new Error(
            `Customer login failed for ${email}: ${errorText}\n` +
            `\n` +
            `This usually means:\n` +
            `  1. Customer user does not exist (run: pnpm e2e:seed)\n` +
            `  2. Password is incorrect\n` +
            `  3. User account is not confirmed\n` +
            `\n` +
            `To fix:\n` +
            `  - Run: pnpm e2e:seed (to create/update test users)\n` +
            `  - Or: Check that Supabase is running and users are seeded`
          )
        }
      }

      await waitForPathnamePrefix(nextPath.split('?')[0] || '/customer/')
      await waitForSupabaseAuthCookie()
    }
  }
}
