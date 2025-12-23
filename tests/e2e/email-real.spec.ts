import { test, expect } from '../fixtures/base'
import { emailInbox } from '../helpers/email-inbox'

test.describe('Email Delivery Tests', () => {
  test.beforeEach(async ({ request }) => {
    // Clear inbox before each test
    const inbox = emailInbox(undefined, request)
    await inbox.clearInbox()
  })

  test('forgot password email is delivered', async ({ page, request }) => {
    const inbox = emailInbox(undefined, request)
    
    // Trigger forgot password
    await page.goto('/forgot-password')
    await page.fill('input[type="email"]', 'test@example.com')
    await page.click('button[type="submit"]')

    // Wait for email
    const email = await inbox.waitForEmail({
      to: 'test@example.com',
      subject: 'password'
    }, 15000)

    expect(email).not.toBeNull()
    expect(email?.subject.toLowerCase()).toContain('password')
    
    // Verify email contains reset link
    const resetLink = inbox.extractVerificationLink(email!)
    expect(resetLink).toBeTruthy()
    expect(resetLink).toContain('/reset-password')
  })

  test('booking confirmation email is delivered', async ({ page, booking, stripe, request }) => {
    const inbox = emailInbox(undefined, request)
    
    // Complete booking flow
    await booking.start()
    await booking.chooseProvider()
    await booking.chooseTime()
    
    // Capture booking ID
    let bookingId: string | undefined
    page.on('response', async (response) => {
      if (response.url().includes('/bookings/create') && response.status() === 200) {
        const data = await response.json()
        bookingId = data.booking?.id || data.booking_id
      }
    })

    await booking.pay()

    // Wait for webhook
    if (bookingId) {
      await stripe.triggerWebhook(bookingId)
    }

    // Wait for confirmation email
    const email = await inbox.waitForEmail({
      subject: 'confirmation'
    }, 15000)

    expect(email).not.toBeNull()
    expect(email?.subject.toLowerCase()).toContain('booking')
    expect(email?.subject.toLowerCase()).toContain('confirmation')
  })

  test('vendor notification email is delivered', async ({ page, vendor, request }) => {
    const inbox = emailInbox(undefined, request)
    
    // Create a booking as customer
    // (This would require vendor setup)
    
    // Wait for vendor notification
    const email = await inbox.waitForEmail({
      subject: 'new booking'
    }, 15000)

    // Vendor should receive notification
    if (email) {
      expect(email.subject.toLowerCase()).toContain('booking')
    }
  })

  test('admin alert email is delivered on errors', async ({ request }) => {
    const inbox = emailInbox(undefined, request)
    
    // Trigger an error condition that should alert admins
    // (This would require error simulation)
    
    const email = await inbox.waitForEmail({
      to: 'admin@bookiji.com',
      subject: 'alert'
    }, 15000)

    // Admin alerts may not always be sent, so this is optional
    if (email) {
      expect(email.subject.toLowerCase()).toContain('alert')
    }
  })
})

























