/**
 * Isolated login helper for crawl tests
 * 
 * This is an optional, self-contained login helper for role-based crawls.
 * It's only used when workspace fixtures don't provide an auth helper.
 * 
 * ADAPTABLE: This helper can be modified or replaced if your workspace
 * has different authentication requirements or patterns.
 * 
 * Usage:
 *   import { loginAsRole } from './helpers/loginHelper'
 *   await loginAsRole(page, 'admin')
 *   await loginAsRole(page, 'vendor')
 *   await loginAsRole(page, 'customer')
 */

import { Page } from '@playwright/test'
import { ensureCustomerUser, ensureVendorUser, ensureAdminUser } from '../../helpers/ensureUser'

const DEFAULT_CUSTOMER_EMAIL = process.env.E2E_CUSTOMER_EMAIL || 'e2e-customer@bookiji.test'
const DEFAULT_CUSTOMER_PASSWORD = process.env.E2E_CUSTOMER_PASSWORD || 'password123'
const DEFAULT_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'
const DEFAULT_VENDOR_PASSWORD = process.env.E2E_VENDOR_PASSWORD || 'TestPassword123!'
const DEFAULT_ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL || 'e2e-admin@bookiji.test'
const DEFAULT_ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD || 'TestPassword123!'

type LoginRole = 'admin' | 'vendor' | 'customer'

/**
 * Waits for the page URL to match a pathname prefix
 */
async function waitForPathnamePrefix(page: Page, pathnamePrefix: string, timeoutMs = 30_000) {
  const prefix = pathnamePrefix.startsWith('/') ? pathnamePrefix : `/${pathnamePrefix}`
  await page.waitForURL((url) => url.pathname.startsWith(prefix), { timeout: timeoutMs, waitUntil: 'domcontentloaded' })
}

/**
 * Waits for Supabase auth cookie to be set
 */
async function waitForSupabaseAuthCookie(page: Page, timeoutMs = 15_000) {
  const start = Date.now()
  while (Date.now() - start < timeoutMs) {
    const cookies = await page.context().cookies()
    const hasAuthCookie = cookies.some((c) => c.name.includes('sb-') && c.name.includes('auth-token'))
    if (hasAuthCookie) return
    await page.waitForTimeout(200)
  }
  throw new Error('Timed out waiting for Supabase auth cookie to be set')
}

/**
 * Logs in as a specific role
 * 
 * @param page - Playwright page instance
 * @param role - Role to login as: 'admin', 'vendor', or 'customer'
 * @param email - Optional email override (defaults to role-specific test email)
 * @param password - Optional password override (defaults to role-specific test password)
 * @param nextPath - Optional redirect path after login (defaults to role-specific dashboard)
 */
export async function loginAsRole(
  page: Page,
  role: LoginRole,
  email?: string,
  password?: string,
  nextPath?: string
): Promise<void> {
  let defaultEmail: string
  let defaultPassword: string
  let defaultNextPath: string
  let ensureUserFn: () => Promise<{ created: boolean; userId: string }>

  switch (role) {
    case 'admin':
      defaultEmail = DEFAULT_ADMIN_EMAIL
      defaultPassword = DEFAULT_ADMIN_PASSWORD
      defaultNextPath = '/admin'
      ensureUserFn = ensureAdminUser
      break
    case 'vendor':
      defaultEmail = DEFAULT_VENDOR_EMAIL
      defaultPassword = DEFAULT_VENDOR_PASSWORD
      defaultNextPath = '/vendor/dashboard'
      ensureUserFn = ensureVendorUser
      break
    case 'customer':
      defaultEmail = DEFAULT_CUSTOMER_EMAIL
      defaultPassword = DEFAULT_CUSTOMER_PASSWORD
      defaultNextPath = '/customer/dashboard'
      ensureUserFn = ensureCustomerUser
      break
    default:
      throw new Error(`Unknown role: ${role}. Must be 'admin', 'vendor', or 'customer'`)
  }

  const loginEmail = email || defaultEmail
  const loginPassword = password || defaultPassword
  const redirectPath = nextPath || defaultNextPath

  // Ensure user exists before attempting login (only for default emails)
  if (loginEmail === defaultEmail) {
    try {
      await ensureUserFn()
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      throw new Error(
        `Cannot login as ${role}: User ${loginEmail} does not exist and could not be created.\n` +
        `${errorMsg}\n` +
        `\n` +
        `To fix:\n` +
        `  1. Run: pnpm e2e:seed (to seed users before tests)\n` +
        `  2. Or: Start Supabase and ensure users are seeded\n` +
        `  3. Or: Check SUPABASE_URL and SUPABASE_SECRET_KEY are set correctly`
      )
    }
  }

  // Navigate to login page
  await page.goto(`/login?next=${encodeURIComponent(redirectPath)}`)
  
  // Fill in credentials
  await page.fill('input[name=email]', loginEmail)
  await page.fill('input[name=password]', loginPassword)
  await page.click('button[type="submit"]')
  
  // Check for login errors
  const url = page.url()
  if (url.includes('/login') && !url.includes('next=')) {
    // Still on login page - check for error messages
    const errorText = await page.locator('text=/invalid|incorrect|error|failed/i').first().textContent().catch(() => null)
    if (errorText) {
      throw new Error(
        `${role} login failed for ${loginEmail}: ${errorText}\n` +
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

  // Wait for successful navigation
  await waitForPathnamePrefix(page, redirectPath.split('?')[0] || `/${role}/`)
  await waitForSupabaseAuthCookie(page)

  // For admin role, verify admin privileges
  if (role === 'admin') {
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
        `User ${loginEmail} exists but does not have admin privileges.\n` +
        `Ensure the user has the 'admin' role in the user_roles table.\n` +
        `Run: CREATE_ADMIN=true pnpm e2e:seed to create a proper admin user.`
      )
    }
  }
}
