import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { getSupabaseConfig } from '@/config/supabase'
import type { 
  PendingNotification, 
  NotificationProcessResult 
} from '@/types/shout-out-metrics'

// This endpoint processes pending notifications
// In production, this would be called by a background worker/cron job
export async function POST(request: NextRequest) {
  try {
    const config = getSupabaseConfig()
    
    // Use service role for background processing
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!serviceRoleKey) {
      return NextResponse.json(
        { success: false, error: 'Service role key not configured' },
        { status: 500 }
      )
    }

    const supabase = createClient(config.url, serviceRoleKey)

    // Get request parameters
    const { channel, limit = 50 } = await request.json().catch(() => ({}))

    // Fetch pending notifications
    const { data: notifications, error: fetchError } = await supabase
      .rpc('get_pending_notifications', {
        p_channel: channel,
        p_limit: limit
      })

    if (fetchError) {
      console.error('Error fetching pending notifications:', fetchError)
      return NextResponse.json(
        { success: false, error: 'Failed to fetch notifications' },
        { status: 500 }
      )
    }

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({
        success: true,
        processed: 0,
        failed: 0,
        errors: []
      })
    }

    const result: NotificationProcessResult = {
      success: true,
      processed: 0,
      failed: 0,
      errors: []
    }

    // Process each notification
    for (const notification of notifications as PendingNotification[]) {
      try {
        const success = await processNotification(notification, supabase)
        
        if (success) {
          result.processed++
          
          // Mark as sent
          await supabase
            .from('shout_out_notifications')
            .update({ 
              status: 'sent', 
              sent_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
        } else {
          result.failed++
          result.errors.push(`Failed to process ${notification.channel} notification for ${notification.vendor_name}`)
          
          // Mark as failed
          await supabase
            .from('shout_out_notifications')
            .update({ 
              status: 'failed',
              updated_at: new Date().toISOString()
            })
            .eq('id', notification.id)
        }
      } catch (error) {
        result.failed++
        result.errors.push(`Error processing notification ${notification.id}: ${error}`)
        
        // Mark as failed
        await supabase
          .from('shout_out_notifications')
          .update({ 
            status: 'failed',
            updated_at: new Date().toISOString()
          })
          .eq('id', notification.id)
      }
    }

    return NextResponse.json(result)

  } catch (error) {
    console.error('Error processing shout-out notifications:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// Helper function to process individual notifications
async function processNotification(
  notification: PendingNotification, 
  supabase: any
): Promise<boolean> {
  switch (notification.channel) {
    case 'in_app':
      // In-app notifications are handled by real-time subscriptions
      // Just mark as processed since the real-time system handles delivery
      return true

    case 'email':
      return await sendEmailNotification(notification)

    case 'sms':
      return await sendSMSNotification(notification)

    default:
      console.warn(`Unknown notification channel: ${notification.channel}`)
      return false
  }
}

// Email notification handler
async function sendEmailNotification(notification: PendingNotification): Promise<boolean> {
  try {
    // In a production environment, you would integrate with your email service
    // For example: SendGrid, Postmark, AWS SES, etc.
    
    const emailData = {
      to: notification.vendor_email,
      subject: 'New Shout-Out Request - Customer Looking for Your Service',
      html: generateEmailHTML(notification),
      text: generateEmailText(notification)
    }

    // Example with a hypothetical email service
    // const result = await emailService.send(emailData)
    // return result.success

    // For demo purposes, just log
    console.log('Email notification sent:', {
      to: notification.vendor_email,
      subject: emailData.subject,
      shout_out_id: notification.shout_out_id
    })

    return true
  } catch (error) {
    console.error('Error sending email notification:', error)
    return false
  }
}

// SMS notification handler
async function sendSMSNotification(notification: PendingNotification): Promise<boolean> {
  try {
    // In a production environment, you would integrate with your SMS service
    // For example: Twilio, AWS SNS, etc.
    
    const message = `New Bookiji request: Customer looking for ${notification.shout_out_service_type}. Open your dashboard to respond: ${process.env.NEXT_PUBLIC_APP_URL}/vendor/shout-outs`

    // Example with a hypothetical SMS service
    // const result = await smsService.send({
    //   to: notification.vendor_phone,
    //   message: message
    // })
    // return result.success

    // For demo purposes, just log
    console.log('SMS notification sent:', {
      to: notification.vendor_phone,
      message: message.substring(0, 50) + '...',
      shout_out_id: notification.shout_out_id
    })

    return true
  } catch (error) {
    console.error('Error sending SMS notification:', error)
    return false
  }
}

// Generate email HTML content
function generateEmailHTML(notification: PendingNotification): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>New Shout-Out Request</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
        .content { padding: 20px; background: #f9fafb; }
        .button { 
          display: inline-block; 
          background: #2563eb; 
          color: white; 
          padding: 12px 24px; 
          text-decoration: none; 
          border-radius: 6px; 
          margin: 16px 0;
        }
        .footer { text-align: center; padding: 20px; color: #666; font-size: 14px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>New Service Request</h1>
        </div>
        <div class="content">
          <h2>Hello ${notification.vendor_name}!</h2>
          <p>A customer is looking for <strong>${notification.shout_out_service_type}</strong> services in your area.</p>
          ${notification.shout_out_description ? `<p><em>"${notification.shout_out_description}"</em></p>` : ''}
          <p>This is a great opportunity to connect with a new customer!</p>
          <a href="${process.env.NEXT_PUBLIC_APP_URL}/vendor/shout-outs" class="button">
            View Request & Respond
          </a>
          <p><small>This request will expire soon, so respond quickly to secure the booking.</small></p>
        </div>
        <div class="footer">
          <p>Bookiji - Connecting customers with service providers</p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate email plain text content
function generateEmailText(notification: PendingNotification): string {
  return `
New Service Request - Bookiji

Hello ${notification.vendor_name}!

A customer is looking for ${notification.shout_out_service_type} services in your area.

${notification.shout_out_description ? `"${notification.shout_out_description}"` : ''}

This is a great opportunity to connect with a new customer!

View the request and respond here:
${process.env.NEXT_PUBLIC_APP_URL}/vendor/shout-outs

This request will expire soon, so respond quickly to secure the booking.

---
Bookiji - Connecting customers with service providers
  `.trim()
}
