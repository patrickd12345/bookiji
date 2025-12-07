import { test, expect } from '../fixtures/base'

test('vendor can create and edit a service', async ({ vendor, services, page }) => {
  await vendor.registerVendor('vendor+services@example.com')
  await services.createService('E2E Massage')
  await services.editService('E2E Massage', 'E2E Massage – Updated')

  await expect(
    page.locator('[data-test="service-row"][data-name="E2E Massage – Updated"]'),
  ).toBeVisible()
})



