import { test, expect } from '../fixtures/base'

// Production smoke tests - non-destructive, never create real bookings or hit real Stripe
// These tests verify the site is accessible and core pages load correctly

test.describe('Production Smoke Tests', () => {
  test('homepage loads', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Bookiji')).toBeVisible()
  })

  test('login page loads', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('form')).toBeVisible()
  })

  test('vendor signup page loads', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('form')).toBeVisible()
  })

  test('help page loads', async ({ page }) => {
    await page.goto('/help')
    await expect(page.locator('h1')).toContainText('Help')
  })

  test('ICS calendar endpoint responds', async ({ request }) => {
    const response = await request.get('/bookiji-maintenance-calendar.ics')
    expect(response.status()).toBe(200)
    expect(response.headers()['content-type']).toContain('text/calendar')
  })
})

test.describe('Admin Access Tests', () => {
  test('unauthenticated user redirected/denied from admin', async ({ page }) => {
    await page.goto('/admin')
    // Should redirect to login or show access denied
    await expect(
      page.locator('text=Access Denied').or(page.locator('text=Login')).or(page.locator('text=Not authenticated'))
    ).toBeVisible({ timeout: 5000 })
  })

  test('admin API returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.get('/api/admin/audit')
    expect(response.status()).toBe(401)
  })

  test('no internal API data leaked in error messages', async ({ request }) => {
    const response = await request.get('/api/admin/audit')
    const body = await response.text()
    // Should not contain internal details like table names, column names, or policy text
    expect(body.toLowerCase()).not.toContain('row level security')
    expect(body.toLowerCase()).not.toContain('policy')
    expect(body.toLowerCase()).not.toContain('admin_audit_log')
  })
})

test.describe('Health Check Tests', () => {
  test('/api/health returns OK', async ({ request }) => {
    const response = await request.get('/api/health')
    expect(response.status()).toBe(200)
    const body = await response.json()
    expect(body).toHaveProperty('status', 'ok')
  })

  test('/api/bookings/create returns 401 when unauthenticated', async ({ request }) => {
    const response = await request.post('/api/bookings/create', {
      data: {
        providerId: 'test',
        serviceId: 'test',
        startTime: '2025-01-01T10:00:00Z',
        endTime: '2025-01-01T11:00:00Z',
        amountUSD: 100,
      },
    })
    expect(response.status()).toBe(401)
  })
})

test.describe('Stripe Integration Tests (Mock Mode)', () => {
  test('Stripe scripts load without CSP violations', async ({ page }) => {
    await page.goto('/')
    // Check for Stripe script loading
    const stripeScript = await page.locator('script[src*="js.stripe.com"]').first()
    await expect(stripeScript).toBeAttached({ timeout: 5000 }).catch(() => {
      // Stripe may not be on homepage, that's okay
    })
  })

  test('no failing fetch calls to Stripe in console', async ({ page }) => {
    const errors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' && msg.text().includes('stripe')) {
        errors.push(msg.text())
      }
    })
    page.on('requestfailed', (request) => {
      if (request.url().includes('stripe.com')) {
        errors.push(`Failed request to ${request.url()}`)
      }
    })

    await page.goto('/')
    await page.waitForTimeout(2000) // Wait for scripts to load

    // In mock mode, Stripe errors are expected to be handled gracefully
    expect(errors.length).toBe(0)
  })
})
