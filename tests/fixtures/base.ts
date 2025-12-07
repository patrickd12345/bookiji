import { test as base, type Page, type APIRequestContext } from '@playwright/test'
import { authHelper } from '../helpers/auth'
import { bookingHelper } from '../helpers/booking'
import { bookingAdvancedHelper } from '../helpers/booking-advanced'
import { stripeHelper } from '../helpers/stripe'
import { vendorHelper } from '../helpers/vendor'
import { servicesHelper } from '../helpers/services'
import { paymentHelper } from '../helpers/payment'
import { emailHelper } from '../helpers/email'

type CustomFixtures = {
  auth: ReturnType<typeof authHelper>
  booking: ReturnType<typeof bookingHelper>
  bookingAdvanced: ReturnType<typeof bookingAdvancedHelper>
  stripe: ReturnType<typeof stripeHelper>
  vendor: ReturnType<typeof vendorHelper>
  services: ReturnType<typeof servicesHelper>
  payment: ReturnType<typeof paymentHelper>
  email: ReturnType<typeof emailHelper>
}

export const test = base.extend<CustomFixtures>({
  auth: async ({ page }, use) => {
    await use(authHelper(page))
  },
  booking: async ({ page }, use) => {
    await use(bookingHelper(page))
  },
  bookingAdvanced: async ({ page }, use) => {
    await use(bookingAdvancedHelper(page))
  },
  stripe: async ({ request }, use) => {
    await use(stripeHelper(request))
  },
  vendor: async ({ page }, use) => {
    await use(vendorHelper(page))
  },
  services: async ({ page }, use) => {
    await use(servicesHelper(page))
  },
  payment: async ({ page }, use) => {
    await use(paymentHelper(page))
  },
  email: async ({ page, request }, use) => {
    await use(emailHelper(page, request))
  },
})

export { expect } from '@playwright/test'
