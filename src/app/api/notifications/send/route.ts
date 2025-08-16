import { NextResponse } from 'next/server'
import { limitRequest } from '@/middleware/requestLimiter'
import { retryNotification } from '@/lib/services/notificationRetry'
import { getEmailTemplate } from '@/lib/services/emailTemplates'
import { getSmsTemplate } from '@/lib/services/smsTemplates'

export interface NotificationRequest {
  type: 'email' | 'sms' | 'push'
  recipient: string
  template:
    | 'verify_email'
    | 'password_reset'
    | 'booking_created'
    | 'booking_updated'
    | 'booking_cancelled'
    | 'review_reminder'
  data: Record<string, unknown>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export async function POST(request: Request) {
  try {
    const limited = limitRequest(request, { windowMs: 60_000, max: 20 })
    if (limited) return limited
    const notification: NotificationRequest = await request.json();

    const { type, recipient, template, data } = notification

    // Validate input
    if (!type || !recipient || !template) {
      return NextResponse.json({ 
        error: 'Type, recipient, and template are required' 
      }, { status: 400 })
    }

    // Process notification based on type
    let result = null

    const sendContext = { type, recipient, template, data }

    switch (type) {
      case 'email':
        result = await retryNotification(
          () => sendEmail(recipient, template, data),
          sendContext
        )
        break
      case 'sms':
        result = await retryNotification(
          () => sendSMS(recipient, template, data),
          sendContext
        )
        break
      case 'push':
        result = await retryNotification(
          () => sendPushNotification(recipient, template, data),
          sendContext
        )
        break
      default:
        return NextResponse.json({
          error: 'Invalid notification type'
        }, { status: 400 })
    }

    if (result.success) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`✅ ${type} notification sent to ${recipient}`)
      }
      return NextResponse.json({
        success: true,
        message: `${type} notification sent successfully`
      })
    } else {
      throw new Error(result.error || `Failed to send ${type} notification`)
    }

  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Notification error:', error)
    }
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send notification',
      success: false
    }, { status: 500 })
  }
}

// Email notification handler
async function sendEmail(recipient: string, template: string, data: Record<string, unknown>) {
  try {
    const { subject, html } = getEmailTemplate(template, data)

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: recipient }] }],
          from: { email: process.env.SENDGRID_FROM },
          subject,
          content: [{ type: 'text/html', value: html }]
        })
      })

      return {
        success: response.ok,
        providerResponse: String(response.status)
      }
    } else {
      // Production: require provider. In dev, allow mock.
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [mock] sending email:', { recipient, subject })
        return { success: true, providerResponse: 'mock' }
      }
      return { success: false, error: 'Email provider not configured' }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Email sending error:', error)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

// SMS notification handler
async function sendSMS(recipient: string, template: string, data: Record<string, unknown>) {
  try {
    const message = getSmsTemplate(template, data)

    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    ) {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
              ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_FROM,
            To: recipient,
            Body: message
          })
        }
      )

      return {
        success: response.ok,
        providerResponse: String(response.status)
      }
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('📱 [mock] sending SMS:', { recipient, message })
        return { success: true, providerResponse: 'mock' }
      }
      return { success: false, error: 'SMS provider not configured' }
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('SMS sending error:', error)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    }
  }
}

// Push notification handler
async function sendPushNotification(recipient: string, template: string, data: Record<string, unknown>) {
  try {
    const pushContent = generatePushContent(template, data)

    if (process.env.FCM_SERVER_KEY) {
      await fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `key=${process.env.FCM_SERVER_KEY}`
        },
        body: JSON.stringify({
          to: recipient,
          notification: {
            title: pushContent.title,
            body: pushContent.body,
            icon: pushContent.icon
          }
        })
      })
    } else {
      if (process.env.NODE_ENV === 'development') {
        console.log('🔔 [mock] sending push notification:', { recipient, pushContent })
      }
    }

    return {
      success: true,
      id: `push_${Date.now()}`,
      message: 'Push notification sent'
    }
  } catch (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('Push notification error:', error)
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send push notification'
    }
  }
}


// Push notification content generator
function generatePushContent(template: string, data: Record<string, unknown>) {
  const templates = {
    booking_confirmation: {
      title: 'Booking Confirmed!',
      body: `${data.service} on ${data.date} at ${data.time}`,
      icon: '/icons/confirm.png'
    },
    booking_cancelled: {
      title: 'Booking Cancelled',
      body: 'Refund will be processed within 3-5 days',
      icon: '/icons/cancel.png'
    },
    vendor_welcome: {
      title: 'Welcome to Bookiji!',
      body: data.requires_approval ? 'Review pending' : 'Verify email to start',
      icon: '/icons/welcome.png'
    },
    admin_alert: {
      title: 'Admin Alert',
      body: `${data.type}: ${data.details}`,
      icon: '/icons/alert.png'
    },
    reminder: {
      title: 'Appointment Reminder',
      body: `${data.service} tomorrow at ${data.time}`,
      icon: '/icons/reminder.png'
    }
  }

  return templates[template as keyof typeof templates] || {
    title: 'Notification',
    body: 'You have a new notification',
    icon: '/icons/default.png'
  }
} 