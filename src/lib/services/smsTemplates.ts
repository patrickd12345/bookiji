interface TemplateData {
  [key: string]: unknown;
}

export function getSmsTemplate(template: string, data: TemplateData): string {
  switch (template) {
    case 'verify_email':
      return `Verify your email, ${data.name}.`;
    case 'password_reset':
      return `Reset your password, ${data.name}.`;
    case 'booking_created':
      return `Booking confirmed for ${data.service} on ${data.date} at ${data.time}.`;
    case 'booking_updated':
      return `Booking updated for ${data.service} on ${data.date}.`;
    case 'booking_cancelled':
      return `Booking for ${data.service} cancelled.`;
    case 'review_reminder':
      return `Please review your recent service.`;
    default:
      return 'Notification from Bookiji';
  }
}

