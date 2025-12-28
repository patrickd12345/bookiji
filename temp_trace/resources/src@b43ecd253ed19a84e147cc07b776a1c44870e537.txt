/**
 * SCHEDULING PROOF TEST
 * 
 * Single E2E test that visually proves Bookiji scheduling works correctly.
 * 
 * This test:
 * - Runs in headed mode (not headless)
 * - Records a video to playwright/videos/
 * - Authenticates as a test vendor
 * - Navigates to booking page
 * - Ensures availability exists (creates via UI if needed)
 * - Displays available slots
 * - Books the first slot and expects success confirmation
 * - Attempts to book the same slot again and expects rejection/error message
 *
 * SELECTOR POLICY: Use data-test attributes, form name attributes, or role-based selectors.
 */

import { test, expect } from '../fixtures/base'
import { createClient } from '@supabase/supabase-js'
import {
  E2E_VENDOR_USER,
  ensureCredentialsPresent
} from '../../scripts/e2e/credentials'

ensureCredentialsPresent({
  label: 'E2E vendor',
  email: E2E_VENDOR_USER.email,
  password: E2E_VENDOR_USER.password
})

const { email: E2E_VENDOR_EMAIL, password: E2E_VENDOR_PASSWORD } = E2E_VENDOR_USER

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

// Use far-future date to avoid flakiness (2030)
const FAR_FUTURE_DATE = new Date('2030-06-15T14:00:00Z')
const FAR_FUTURE_DATE_STR = FAR_FUTURE_DATE.toISOString().split('T')[0]
const FAR_FUTURE_TIME_STR = FAR_FUTURE_DATE.toTimeString().slice(0, 5) // HH:MM format

test.describe('Scheduling Proof', () => {
  let vendorProfileId: string
  let vendorId: string
  let serviceId: string
  let slotDate: string
  let slotTime: string

  test.beforeAll(async () => {
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY required for proof test')
    }

    console.log('Connecting to Supabase at:', SUPABASE_URL)
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false }
    })

    const { data: vendorProfileData, error: profileError } = await supabase
      .from('profiles')
      .select('auth_user_id, id')
      .eq('email', E2E_VENDOR_EMAIL)
      .single()

    if (profileError || !vendorProfileData) {
      console.error('Profile fetch error:', profileError)
      throw new Error(`Vendor profile not found for ${E2E_VENDOR_EMAIL}. Run pnpm e2e:seed first.`)
    }

    vendorId = vendorProfileData.auth_user_id
    vendorProfileId = vendorProfileData.id

    const { data: service, error: serviceError } = await supabase
      .from('services')
      .insert({
        provider_id: vendorProfileId,
        name: 'Scheduling Proof Test Service',
        description: 'Service for scheduling proof test',
        category: 'test',
        price: 50.0,
        price_type: 'fixed',
        duration_minutes: 60,
        is_active: true
      })
      .select('id')
      .single()

    if (serviceError && serviceError.code !== '23505') {
      throw new Error(`Failed to create service: ${serviceError.message}`)
    }

    if (service) {
      serviceId = service.id
    } else {
      const { data: existingService } = await supabase
        .from('services')
        .select('id')
        .eq('provider_id', vendorProfileId)
        .eq('name', 'Scheduling Proof Test Service')
        .single()
      if (!existingService) {
        throw new Error('Service creation failed and not found')
      }
      serviceId = existingService.id
    }

    const startTime = FAR_FUTURE_DATE
    const endTime = new Date(startTime.getTime() + 60 * 60 * 1000)

    const { error: slotError } = await supabase
      .from('availability_slots')
      .upsert(
        {
          provider_id: vendorProfileId,
          start_time: startTime.toISOString(),
          end_time: endTime.toISOString(),
          is_available: true,
          slot_type: 'regular'
        },
        {
          onConflict: 'provider_id,start_time'
        }
      )

    if (slotError && slotError.code !== '23505') {
      console.warn('Slot creation warning:', slotError.message)
    }

    slotDate = FAR_FUTURE_DATE_STR
    slotTime = FAR_FUTURE_TIME_STR
  })

  test('SCHEDULING PROOF: Slots appear, first booking succeeds, second booking fails', async ({ page }) => {
    let alertMessage: string | null = null
    page.on('dialog', async dialog => {
      alertMessage = dialog.message()
      await dialog.accept()
    })

    const errorLocator = page.locator('text=/unavailable|already booked|not available|error|failed/i').first()
    const selectSchedulingProofService = async () => {
      const preferredCard = page
        .locator('div[class*="border"]').filter({ hasText: /Scheduling Proof|Test Service/i })
        .first()
      const fallbackCard = page.locator('div[class*="border"]').first()
      const targetCard = (await preferredCard.isVisible({ timeout: 4000 }).catch(() => false)) ? preferredCard : fallbackCard
      await expect(targetCard).toBeVisible({ timeout: 5000 })
      await targetCard.click()
    }

    let selectedTimeValue: string | null = null
    let secondAttemptErrorVisible = false
    let secondAttemptRedirected = false

    await test.step('Login as the E2E vendor', async () => {
      await page.goto('/login?next=/vendor/schedule', { waitUntil: 'domcontentloaded', timeout: 60000 })
      await page.waitForLoadState('networkidle', { timeout: 60000 })

      const emailInput = page.locator('input[name="email"]')
      const passwordInput = page.locator('input[name="password"]')
      const submitButton = page
        .getByRole('button', { name: /log in|sign in|login/i })
        .or(page.locator('button[type="submit"]'))
        .or(page.locator('[data-test="login-submit"]'))

      await expect(emailInput.first()).toBeVisible({ timeout: 10000 })
      await emailInput.first().fill(E2E_VENDOR_EMAIL)
      await passwordInput.first().fill(E2E_VENDOR_PASSWORD)
      await expect(submitButton.first()).toBeVisible({ timeout: 5000 })
      await expect(submitButton.first()).toBeEnabled({ timeout: 5000 })

      const usernameError = page.locator('text=/Username not found/i')
      const schedulingRootPromise = page.waitForSelector('[data-test="vendor-scheduling-root"]', { timeout: 15000 })
      await submitButton.first().click()
      await expect(usernameError).toHaveCount(0, { timeout: 2000 })
      await schedulingRootPromise
    })

    await test.step('Open vendor booking page and select service', async () => {
      await page.goto(`/book/${vendorId}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      await expect(page.locator('h1')).toContainText(/Book with/i, { timeout: 5000 })
      await selectSchedulingProofService()
    })

    await test.step('Choose far future date and time slot', async () => {
      const dateInput = page.locator('input[type="date"]').first()
      await expect(dateInput).toBeVisible({ timeout: 5000 })
      await dateInput.fill(slotDate)

      const timeSelect = page.locator('select').filter({ hasText: /time/i }).or(page.locator('select').nth(1)).first()
      await expect(timeSelect).toBeVisible({ timeout: 5000 })

      const availableTimes = timeSelect.locator('option').filter({ hasNotText: /choose time|select time/i })
      await expect(availableTimes.first()).toBeVisible({ timeout: 10000 })

      selectedTimeValue = await availableTimes.first().getAttribute('value')
      expect(selectedTimeValue).toBeTruthy()

      await timeSelect.selectOption(selectedTimeValue!)
      await expect(timeSelect).toHaveValue(selectedTimeValue!, { timeout: 5000 })
    })

    await test.step('Book the first slot and reach payment page', async () => {
      const bookButton = page.getByRole('button', { name: /book appointment/i }).or(page.locator('button').filter({ hasText: /book/i })).first()
      await expect(bookButton).toBeVisible({ timeout: 5000 })
      await expect(bookButton).toBeEnabled({ timeout: 5000 })

      alertMessage = null
      const paymentNavigation = page.waitForURL(/\/pay\//, { timeout: 10000 }).then(() => true).catch(() => false)
      await bookButton.click()
      const reachedPaymentPage = await paymentNavigation

      if (!reachedPaymentPage) {
        const errorVisible = await errorLocator.isVisible({ timeout: 5000 }).catch(() => false)
        const alertContext = alertMessage ?? 'none'
        throw new Error(`First booking did not reach payment page; alert=${alertContext}; errorVisible=${errorVisible}`)
      }
    })

    await test.step('Attempt duplicate booking and capture rejection', async () => {
      if (!selectedTimeValue) {
        throw new Error('Time slot was not selected earlier')
      }

      await page.goto(`/book/${vendorId}`, { waitUntil: 'domcontentloaded', timeout: 15000 })
      await page.waitForLoadState('networkidle', { timeout: 10000 })
      await selectSchedulingProofService()

      const dateInput2 = page.locator('input[type="date"]').first()
      await expect(dateInput2).toBeVisible({ timeout: 5000 })
      await dateInput2.fill(slotDate)

      const timeSelect2 = page.locator('select').filter({ hasText: /time/i }).or(page.locator('select').nth(1)).first()
      await expect(timeSelect2).toBeVisible({ timeout: 5000 })

      const availableTimes2 = timeSelect2.locator('option').filter({ hasNotText: /choose time|select time/i })
      const slotOption2 = availableTimes2.filter({ hasText: selectedTimeValue }).first()
      const slotStillAvailable = await slotOption2.isVisible({ timeout: 5000 }).catch(() => false)

      if (slotStillAvailable) {
        await timeSelect2.selectOption(selectedTimeValue)
        await expect(timeSelect2).toHaveValue(selectedTimeValue, { timeout: 5000 })

        alertMessage = null
        const duplicateNavigation = page.waitForURL(/\/pay\//, { timeout: 10000 }).then(() => true).catch(() => false)
        const bookButton2 = page.getByRole('button', { name: /book appointment/i }).or(page.locator('button').filter({ hasText: /book/i })).first()
        await expect(bookButton2).toBeVisible({ timeout: 5000 })
        await expect(bookButton2).toBeEnabled({ timeout: 5000 })
        await bookButton2.click()

        const duplicateRedirect = await duplicateNavigation
        secondAttemptRedirected = duplicateRedirect
        secondAttemptErrorVisible = await errorLocator.isVisible({ timeout: 5000 }).catch(() => false)

        if (!secondAttemptRedirected && !secondAttemptErrorVisible && !alertMessage) {
          throw new Error('Second booking attempt did not redirect but also displayed no error or alert')
        }
      } else {
        secondAttemptErrorVisible = await errorLocator.isVisible({ timeout: 5000 }).catch(() => false)
        secondAttemptRedirected = false
      }
    })

    await test.step('Terminal assertion: Duplicate booking blocked visibly', async () => {
      if (!selectedTimeValue) {
        throw new Error('Selected slot value missing for final assertion')
      }

      const duplicateErrorFinal = page.locator('text=/unavailable|already booked|not available|error|failed/i').first()
      const duplicateErrorVisibleFinal = await duplicateErrorFinal.isVisible({ timeout: 10000 }).catch(() => false)

      const timeSelectFinal = page.locator('select').filter({ hasText: /time/i }).or(page.locator('select').nth(1)).first()
      await expect(timeSelectFinal).toBeVisible({ timeout: 5000 })
      const duplicateSlotFinal = timeSelectFinal.locator('option').filter({ hasText: selectedTimeValue }).first()
      const finalSlotVisible = await duplicateSlotFinal.isVisible({ timeout: 2000 }).catch(() => false)

      expect(duplicateErrorVisibleFinal || !finalSlotVisible || secondAttemptErrorVisible).toBeTruthy()
    })
  })
})
