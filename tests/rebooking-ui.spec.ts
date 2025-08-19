import { test, expect } from '@playwright/test'

test('rebook button triggers instant rebooking flow', async ({ page, request }) => {
  // Seed booking
  const svc = process.env.TEST_SERVICE_ID!
  const create = await request.post('/api/bookings/create-test', { data: { service_id: svc } })
  expect(create.ok()).toBeTruthy()
  const { bookingId } = await create.json()

  await page.goto(`/confirm/${bookingId}`, { waitUntil: 'networkidle' })

  const rebookBtn = page.getByTestId('rebook-btn')
  await expect(rebookBtn).toBeVisible()

  // Observe the POST to rebook
  const rebookUrlPart = `/api/bookings/${bookingId}/rebook`
  const waitPost = page.waitForResponse((r) => r.url().includes(rebookUrlPart) && [200,201].includes(r.status()))

  await rebookBtn.click()
  // Click again quickly (idempotency)
  await rebookBtn.click()
  const res = await waitPost
  expect([200,201]).toContain(res.status())

  // Signal: either we navigate to a new confirmation page or show a toast
  const maybeToast = page.getByTestId('rebook-toast')
  const urlAfter = page.url()

  // Accept either success route: toast becomes visible OR URL changes to /confirm/<newId>
  const toastVisible = await maybeToast.isVisible().catch(() => false)
  const navigatedToNewConfirm = /\/confirm\/[A-Za-z0-9-]{10,}$/.test(urlAfter) && !urlAfter.endsWith(bookingId)

  expect(toastVisible || navigatedToNewConfirm).toBeTruthy()

  // Accessible name for the button
  await expect(page.getByRole('button', { name: 'Rebook' })).toBeVisible()
  // Live region presence and politeness
  const status = page.getByRole('status')
  await expect(status).toHaveAttribute('aria-live', /polite|assertive/)

  // Primary heading should be present
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
})


