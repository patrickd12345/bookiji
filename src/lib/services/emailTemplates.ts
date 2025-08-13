interface TemplateData {
  [key: string]: unknown;
}

interface EmailTemplate {
  subject: string;
  html: string;
}

export function getEmailTemplate(template: string, data: TemplateData): EmailTemplate {
  switch (template) {
    case 'verify_email':
      return {
        subject: 'Verify your email',
        html: `<p>Hi ${data.name}, click the link to verify your email.</p>`
      };
    case 'password_reset':
      return {
        subject: 'Reset your password',
        html: `<p>Hi ${data.name}, use the following link to reset your password.</p>`
      };
    case 'booking_created':
      return {
        subject: `Booking Confirmed - ${data.service}`,
        html: `
          <h2>Booking Confirmed!</h2>
          <p>Dear ${data.customer_name},</p>
          <p>Your booking has been confirmed for ${data.service} on ${data.date} at ${data.time}.</p>
        `
      };
    case 'booking_updated':
      return {
        subject: `Booking Updated - ${data.service}`,
        html: `<p>Your booking on ${data.date} has been updated.</p>`
      };
    case 'booking_cancelled':
      return {
        subject: `Booking Cancelled - ${data.service}`,
        html: `<p>Your booking for ${data.service} has been cancelled.</p>`
      };
    case 'review_reminder':
      return {
        subject: 'Leave a review',
        html: `<p>Please take a moment to review your recent service.</p>`
      };
    default:
      return { subject: 'Notification', html: '<p>Notification content</p>' };
  }
}

