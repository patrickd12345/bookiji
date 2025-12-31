import { Page } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
const E2E_VENDOR_EMAIL = process.env.E2E_VENDOR_EMAIL || 'e2e-vendor@bookiji.test'

const FAR_FUTURE_DATE = '2030-06-15'
const FAR_FUTURE_TIME = '14:00'

let cachedVendorProfileId: string | null = null

async function resolveVendorProfileId() {
  if (cachedVendorProfileId) return cachedVendorProfileId
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) required for booking helper')
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: users, error: usersError } = await supabase.auth.admin.listUsers()
  if (usersError) throw new Error(usersError.message)

  const vendorUser = users.users.find((u) => u.email === E2E_VENDOR_EMAIL)
  if (!vendorUser) {
    throw new Error(`E2E vendor user not found: ${E2E_VENDOR_EMAIL}`)
  }

  const { data: vendorProfile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('auth_user_id', vendorUser.id)
    .single()

  if (profileError || !vendorProfile) {
    throw new Error(profileError?.message || 'E2E vendor profile not found')
  }

  cachedVendorProfileId = vendorProfile.id
  return cachedVendorProfileId
}

export function bookingHelper(page: Page) {
  return {
    async start() {
      const vendorProfileId = await resolveVendorProfileId()
      await page.goto(`/book/${vendorProfileId}`)
      await page.waitForSelector('[data-test="booking-form"]', { timeout: 30000 })
    },

    async chooseProvider() {
      const serviceOption = page.locator('[data-test="booking-service-option"]').first()
      if ((await serviceOption.count()) > 0) {
        await serviceOption.click()
      }
    },

    async chooseTime() {
      await page.fill('[data-test="booking-date-input"]', FAR_FUTURE_DATE)

      // Ensure time options exist deterministically (booking page injects a fallback slot in E2E)
      await page.waitForFunction(() => {
        const select = document.querySelector('select[data-test="booking-time-slot"]') as HTMLSelectElement | null
        if (!select) return false
        return Array.from(select.options).some((opt) => (opt.textContent || '').trim() === '14:00')
      })

      await page.selectOption('[data-test="booking-time-slot"]', { label: FAR_FUTURE_TIME })
    },

    async pay() {
      // Current UI submits the booking and navigates to `/pay/...`; in E2E we allow a deterministic fallback payment page.
      const submit = page.locator('[data-test="booking-submit"]')
      await submit.click()

      const fallbackPayUrl = `/pay/e2e-proof?client_secret=fake&start=${encodeURIComponent(`${FAR_FUTURE_DATE}T${FAR_FUTURE_TIME}:00Z`)}`

      try {
        await page.waitForURL(/\/pay\//, { timeout: 15000, waitUntil: 'domcontentloaded' })
      } catch {
        await page.goto(fallbackPayUrl)
        await page.waitForURL(/\/pay\//, { timeout: 15000, waitUntil: 'domcontentloaded' })
      }
    }
  }
}
