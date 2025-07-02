import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabaseClient'

interface NotificationRequest {
  type: 'email' | 'sms' | 'push'
  recipient: string
  template: 'booking_confirmation' | 'booking_cancelled' | 'vendor_welcome' | 'admin_alert' | 'reminder'
  data: Record<string, any>
  priority?: 'low' | 'normal' | 'high' | 'urgent'
}

export async function POST(request: Request) {
  try {
    const notification: NotificationRequest = await request.json()

    const { type, recipient, template, data, priority = 'normal' } = notification

    // Validate input
    if (!type || !recipient || !template) {
      return NextResponse.json({ 
        error: 'Type, recipient, and template are required' 
      }, { status: 400 })
    }

    // Process notification based on type
    let result = null

    switch (type) {
      case 'email':
        result = await sendEmail(recipient, template, data)
        break
      case 'sms':
        result = await sendSMS(recipient, template, data)
        break
      case 'push':
        result = await sendPushNotification(recipient, template, data)
        break
      default:
        return NextResponse.json({ 
          error: 'Invalid notification type' 
        }, { status: 400 })
    }

    if (result.success) {
      console.log(`✅ ${type} notification sent to ${recipient}`)
      return NextResponse.json({
        success: true,
        message: `${type} notification sent successfully`,
        notification_id: result.id
      })
    } else {
      throw new Error(result.error || `Failed to send ${type} notification`)
    }

  } catch (error) {
    console.error('Notification error:', error)
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Failed to send notification',
      success: false
    }, { status: 500 })
  }
}

// Email notification handler
async function sendEmail(recipient: string, template: string, data: Record<string, any>) {
  try {
    const { subject, html } = generateEmailContent(template, data)

    if (process.env.SENDGRID_API_KEY && process.env.SENDGRID_FROM) {
      await fetch('https://api.sendgrid.com/v3/mail/send', {
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
    } else {
      console.log('📧 [mock] sending email:', { recipient, subject })
    }

    return {
      success: true,
      id: `email_${Date.now()}`,
      message: 'Email queued for delivery'
    }
  } catch (error) {
    console.error('Email sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send email'
    }
  }
}

// SMS notification handler
async function sendSMS(recipient: string, template: string, data: Record<string, any>) {
  try {
    const message = generateSMSContent(template, data)

    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: process.env.TWILIO_FROM,
          To: recipient,
          Body: message
        })
      })
    } else {
      console.log('📱 [mock] sending SMS:', { recipient, message })
    }

    return {
      success: true,
      id: `sms_${Date.now()}`,
      message: 'SMS queued for delivery'
    }
  } catch (error) {
    console.error('SMS sending error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send SMS'
    }
  }
}

// Push notification handler
async function sendPushNotification(recipient: string, template: string, data: Record<string, any>) {
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
      console.log('🔔 [mock] sending push notification:', { recipient, pushContent })
    }

    return {
      success: true,
      id: `push_${Date.now()}`,
      message: 'Push notification sent'
    }
  } catch (error) {
    console.error('Push notification error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to send push notification'
    }
  }
}

// Email content generator
function generateEmailContent(template: string, data: Record<string, any>) {
  const templates = {
    booking_confirmation: {
      subject: `Booking Confirmed - ${data.service}`,
      html: `
        <h2>Booking Confirmed!</h2>
        <p>Dear ${data.customer_name},</p>
        <p>Your booking has been confirmed:</p>
        <ul>
          <li><strong>Service:</strong> ${data.service}</li>
          <li><strong>Provider:</strong> ${data.provider_name}</li>
          <li><strong>Date:</strong> ${data.date}</li>
          <li><strong>Time:</strong> ${data.time}</li>
        </ul>
        <p>You'll receive provider contact details 24 hours before your appointment.</p>
        <p>Thank you for choosing Bookiji!</p>
      `
    },
    booking_cancelled: {
      subject: `Booking Cancelled - ${data.service}`,
      html: `
        <h2>Booking Cancelled</h2>
        <p>Dear ${data.customer_name},</p>
        <p>Your booking has been cancelled:</p>
        <ul>
          <li><strong>Service:</strong> ${data.service}</li>
          <li><strong>Date:</strong> ${data.date}</li>
          <li><strong>Time:</strong> ${data.time}</li>
        </ul>
        <p>Your commitment fee will be refunded within 3-5 business days.</p>
        <p>We hope to serve you again soon!</p>
      `
    },
    vendor_welcome: {
      subject: 'Welcome to Bookiji - Get Started',
      html: `
        <h2>Welcome to Bookiji!</h2>
        <p>Dear ${data.business_name},</p>
        <p>Thank you for joining our network of trusted service providers.</p>
        ${data.requires_approval ? 
          '<p>Your custom service type is being reviewed. You\'ll hear from us within 24-48 hours.</p>' :
          '<p>Please verify your email to start accepting bookings.</p>'
        }
        <p>Next steps:</p>
        <ol>
          <li>Complete your profile setup</li>
          <li>Set your availability</li>
          <li>Start accepting bookings!</li>
        </ol>
      `
    },
    admin_alert: {
      subject: `Admin Alert - ${data.type}`,
      html: `
        <h2>Admin Alert</h2>
        <p><strong>Type:</strong> ${data.type}</p>
        <p><strong>Details:</strong> ${data.details}</p>
        <p><strong>Time:</strong> ${new Date().toISOString()}</p>
        <p>Please review and take appropriate action.</p>
      `
    },
    reminder: {
      subject: `Reminder - ${data.service}`,
      html: `
        <h2>Appointment Reminder</h2>
        <p>Dear ${data.customer_name},</p>
        <p>This is a reminder for your upcoming appointment:</p>
        <ul>
          <li><strong>Service:</strong> ${data.service}</li>
          <li><strong>Date:</strong> ${data.date}</li>
          <li><strong>Time:</strong> ${data.time}</li>
        </ul>
        <p>See you soon!</p>
      `
    }
  }

  return templates[template as keyof typeof templates] || {
    subject: 'Notification',
    html: '<p>Notification content</p>'
  }
}

// SMS content generator
function generateSMSContent(template: string, data: Record<string, any>) {
  const templates = {
    booking_confirmation: `Booking confirmed! ${data.service} on ${data.date} at ${data.time}. Provider details coming 24hrs before. - Bookiji`,
    booking_cancelled: `Booking cancelled. Refund processed within 3-5 days. Book again at bookiji.com - Bookiji`,
    vendor_welcome: `Welcome to Bookiji! ${data.requires_approval ? 'Review pending.' : 'Verify email to start.'} - Bookiji`,
    admin_alert: `Admin Alert: ${data.type} - ${data.details}`,
    reminder: `Reminder: ${data.service} tomorrow at ${data.time}. See you soon! - Bookiji`
  }

  return templates[template as keyof typeof templates] || 'Notification from Bookiji'
}

// Push notification content generator
function generatePushContent(template: string, data: Record<string, any>) {
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