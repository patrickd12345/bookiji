import { test, expect } from '@playwright/test'

test('confirmation page exposes valid ICS + calendar links', async ({ page, request }) => {
  // 1) Create a fresh pending booking via your test-only route
  const svc = process.env.TEST_SERVICE_ID!
  const create = await request.post('/api/bookings/create-test', { data: { service_id: svc } })
  expect(create.ok()).toBeTruthy()
  const { bookingId } = await create.json()

  // 2) Visit confirmation page
  await page.goto(`/confirm/${bookingId}`, { waitUntil: 'networkidle' })

  // 3) Presence checks
  const ics   = page.getByTestId('add-to-calendar-ics')
  await expect(ics).toBeVisible()

  // 3b) Accessible names (use role-based checks for user-facing labels)
  const gcalBtn = page.getByRole('button', { name: /Add to Google Calendar/i })
  await expect(gcalBtn).toBeVisible()
  await expect(page.getByRole('button', { name: /Add to Outlook/i })).toBeVisible()
  await expect(page.getByRole('button', { name: /(Add to Apple|Download \.ics File)/i })).toBeVisible()

  // 3c) External link safety if any calendar action uses anchor tags with target=_blank
  const gcalLink = page.getByRole('link', { name: /Add to Google Calendar/i })
  const target = await gcalLink.getAttribute('target')
  if (target === '_blank') {
    await expect(gcalLink).toHaveAttribute('rel', /noopener/) 
  }

  // 4) Fetch ICS content via API client
  const icsUrl = `/api/calendar.ics?bookingId=${encodeURIComponent(bookingId)}`
  const icsRes = await request.get(icsUrl)
  expect(icsRes.ok()).toBeTruthy()

  const icsText = await icsRes.text()
  // 5) Minimal VCALENDAR sanity
  expect(icsText).toContain('BEGIN:VCALENDAR')
  expect(icsText).toContain('VERSION:2.0')
  expect(icsText).toContain('PRODID:-//Bookiji//Booking Platform//EN')
  expect(icsText).toContain('END:VCALENDAR')
  expect(icsText).toMatch(/\nDTSTART(?:;[^:]+)?:\d{8}T\d{6}Z/)
  expect(icsText).toMatch(/SUMMARY:/)
  expect(icsText).toMatch(/UID:.*@bookiji\.com/)

  // 6) Headers sanity for download behavior
  const headers = icsRes.headers()
  expect(headers['content-type']?.toLowerCase()).toContain('text/calendar')
  const cd = headers['content-disposition'] || ''
  expect(cd.toLowerCase()).toMatch(/attachment/)
  expect(cd).toMatch(/\.ics/i)
})


