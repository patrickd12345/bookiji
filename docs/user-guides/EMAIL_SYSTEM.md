# Email System Documentation

## Overview

Bookiji uses MailerSend SMTP for transactional emails, including booking confirmations, notifications, and other automated communications. The system is designed to be reliable, maintainable, and easily extensible.

## Architecture

### Core Components

1. **`/src/lib/mailer.ts`** - Main SMTP transport configuration using nodemailer
2. **`/src/lib/emailTemplates.ts`** - HTML email templates and generation functions
3. **`/src/app/api/test-email/route.ts`** - Test endpoint for email functionality
4. **Integration with booking system** - Automatic email sending on booking creation

### Email Flow

```
Booking Created → Generate Email Template → Send via MailerSend → Customer Receives Confirmation
```

## Configuration

### Environment Variables

Add these to your `.env.local` file:

```bash
# MailerSend SMTP Configuration
MAILERSEND_SMTP_HOST=smtp.mailersend.net
MAILERSEND_SMTP_PORT=587
MAILERSEND_SMTP_USER=MS_xxxxx@bookiji.com
MAILERSEND_SMTP_PASS=your_mailersend_password
MAILERSEND_FROM_NAME=Bookiji
MAILERSEND_FROM_EMAIL=noreply@bookiji.com
```

### MailerSend Setup

1. Create a MailerSend account at [mailersend.com](https://mailersend.com)
2. Add and verify your domain (e.g., `bookiji.com`)
3. Create an SMTP user with the format `MS_xxxxx@bookiji.com`
4. Use the generated password in `MAILERSEND_SMTP_PASS`

## Usage

### Sending Emails

```typescript
import { sendEmail } from '@/lib/mailer';

await sendEmail({
  to: 'customer@example.com',
  subject: 'Booking Confirmation',
  html: '<h1>Your booking is confirmed!</h1>'
});
```

### Using Email Templates

```typescript
import { generateBookingConfirmationEmail } from '@/lib/emailTemplates';

const emailHtml = generateBookingConfirmationEmail({
  customerName: 'John Doe',
  vendorName: 'Acme Services',
  serviceName: 'Haircut',
  slotStart: '2024-01-15T10:00:00Z',
  slotEnd: '2024-01-15T11:00:00Z',
  totalAmount: '$50.00',
  bookingId: 'booking_123',
  vendorAddress: '123 Main St, City',
  notes: 'Please arrive 10 minutes early'
});

await sendEmail({
  to: 'customer@example.com',
  subject: 'Booking Confirmation - Bookiji',
  html: emailHtml
});
```

## Email Templates

### Available Templates

1. **`generateBookingConfirmationEmail`** - Professional booking confirmation with all details
2. **`generateSimpleEmailTemplate`** - Generic template for simple notifications

### Template Features

- **Responsive Design** - Works on all device sizes
- **Brand Consistency** - Uses Bookiji colors and styling
- **Professional Layout** - Clean, modern email design
- **Accessibility** - Proper HTML structure and semantic markup

### Customizing Templates

Templates are defined in `/src/lib/emailTemplates.ts`. To modify:

1. Update the HTML structure in the template functions
2. Modify the CSS styles inline (email clients prefer inline styles)
3. Test with various email clients

## Testing

### Test Endpoint

Use `/api/test-email` to test email functionality:

```bash
# Test with curl
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "test@example.com",
    "subject": "Test Email",
    "html": "<h1>Hello World</h1>"
  }'
```

### Running Tests

```bash
# Run email system tests
pnpm vitest run tests/unit/mailer.spec.ts

# Run all tests
pnpm vitest run
```

## Error Handling

### Graceful Degradation

- Email failures don't break booking creation
- Errors are logged for debugging
- System continues to function even if email service is down

### Common Issues

1. **SMTP Authentication Failed**
   - Check `MAILERSEND_SMTP_USER` and `MAILERSEND_SMTP_PASS`
   - Verify domain verification in MailerSend dashboard
   - **Gmail-specific**: If using Gmail SMTP, you must use an App Password (not your regular password). Enable 2FA in your Google Account, then generate an App Password at https://myaccount.google.com/apppasswords

2. **Gmail Error 535-5.7.8 (BadCredentials)**
   - This error occurs when Gmail rejects authentication
   - **Solution**: Use a Gmail App Password instead of your regular password
   - Steps:
     1. Enable 2-Step Verification in your Google Account
     2. Go to https://myaccount.google.com/apppasswords
     3. Generate an App Password for "Mail"
     4. Use this 16-character password (without spaces) as `SMTP_PASS`
   - **Note**: The project uses MailerSend by default, which avoids Gmail authentication issues

3. **Connection Timeout**
   - Check `MAILERSEND_SMTP_HOST` and `MAILERSEND_SMTP_PORT`
   - Verify firewall/network settings

4. **Email Not Delivered**
   - Check spam folder
   - Verify sender domain reputation
   - Review MailerSend delivery logs

## Monitoring & Analytics

### Logging

Email operations are logged with:
- Success/failure status
- Recipient information
- Error details (if applicable)
- Message ID for tracking

### MailerSend Dashboard

Monitor email performance through:
- Delivery rates
- Bounce rates
- Spam complaints
- Open/click tracking (if enabled)

## Security Considerations

### Data Protection

- Customer emails are only used for transactional purposes
- No marketing emails without explicit consent
- Email content is sanitized to prevent injection attacks

### Rate Limiting

- Consider implementing rate limiting for the test endpoint
- Monitor for abuse patterns
- Set reasonable limits per user/IP

## Future Enhancements

### Planned Features

1. **Email Queue System** - Handle high-volume email sending
2. **Template Management** - Admin interface for email templates
3. **A/B Testing** - Test different email variations
4. **Advanced Analytics** - Track email engagement metrics
5. **Multi-language Support** - Localized email templates

### Integration Opportunities

1. **Webhook Notifications** - Real-time delivery status
2. **Email Preferences** - Customer email frequency controls
3. **Transactional Templates** - More specialized email types
4. **Email Scheduling** - Send emails at optimal times

## Support

### Troubleshooting

1. Check environment variables are set correctly
2. Verify MailerSend account status and domain verification
3. Review application logs for detailed error messages
4. Test with the `/api/test-email` endpoint

### Getting Help

- Review MailerSend documentation
- Check application logs for specific error messages
- Test email functionality in development environment
- Contact support team for persistent issues
