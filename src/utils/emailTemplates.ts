// src/utils/emailTemplates.ts

// =====================
// 📧 Bookiji Email Templates
// =====================

export function bookingConfirmationTemplate({
  customerName,
  vendorName,
  serviceName,
  bookingDate,
  bookingTime,
  bookingId,
}: {
  customerName: string
  vendorName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  bookingId: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>✅ Booking Confirmed</h1>
      <p>Hi ${customerName},</p>
      <p>Your booking has been confirmed with <strong>${vendorName}</strong>.</p>
      <p><b>Service:</b> ${serviceName}<br/>
         <b>Date:</b> ${bookingDate}<br/>
         <b>Time:</b> ${bookingTime}<br/>
         <b>Booking ID:</b> ${bookingId}</p>
      <p>We look forward to seeing you! 🎉</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}

export function vendorNotificationTemplate({
  vendorName,
  customerName,
  serviceName,
  bookingDate,
  bookingTime,
  bookingId,
}: {
  vendorName: string
  customerName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  bookingId: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>📅 New Booking</h1>
      <p>Hello ${vendorName},</p>
      <p>You have a new booking from <strong>${customerName}</strong>.</p>
      <p><b>Service:</b> ${serviceName}<br/>
         <b>Date:</b> ${bookingDate}<br/>
         <b>Time:</b> ${bookingTime}<br/>
         <b>Booking ID:</b> ${bookingId}</p>
      <p>Log into your Bookiji dashboard for full details.</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}

export function bookingCancellationTemplate({
  customerName,
  vendorName,
  serviceName,
  bookingDate,
  bookingTime,
  bookingId,
}: {
  customerName: string
  vendorName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  bookingId: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>❌ Booking Cancelled</h1>
      <p>Hi ${customerName},</p>
      <p>Your booking with <strong>${vendorName}</strong> has been cancelled.</p>
      <p><b>Service:</b> ${serviceName}<br/>
         <b>Date:</b> ${bookingDate}<br/>
         <b>Time:</b> ${bookingTime}<br/>
         <b>Booking ID:</b> ${bookingId}</p>
      <p>If this was a mistake, you can rebook anytime on Bookiji.</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}

export function bookingRescheduleTemplate({
  customerName,
  vendorName,
  serviceName,
  oldDate,
  oldTime,
  newDate,
  newTime,
  bookingId,
}: {
  customerName: string
  vendorName: string
  serviceName: string
  oldDate: string
  oldTime: string
  newDate: string
  newTime: string
  bookingId: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>🔄 Booking Rescheduled</h1>
      <p>Hi ${customerName},</p>
      <p>Your booking with <strong>${vendorName}</strong> has been rescheduled.</p>
      <p><b>Service:</b> ${serviceName}<br/>
         <b>Old Date/Time:</b> ${oldDate} at ${oldTime}<br/>
         <b>New Date/Time:</b> ${newDate} at ${newTime}<br/>
         <b>Booking ID:</b> ${bookingId}</p>
      <p>We'll see you at the new time! ⏰</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}

export function bookingReminderTemplate({
  customerName,
  vendorName,
  serviceName,
  bookingDate,
  bookingTime,
  bookingId,
}: {
  customerName: string
  vendorName: string
  serviceName: string
  bookingDate: string
  bookingTime: string
  bookingId: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>⏰ Appointment Reminder</h1>
      <p>Hi ${customerName},</p>
      <p>This is a friendly reminder of your upcoming booking:</p>
      <p><b>Service:</b> ${serviceName}<br/>
         <b>Vendor:</b> ${vendorName}<br/>
         <b>Date:</b> ${bookingDate}<br/>
         <b>Time:</b> ${bookingTime}<br/>
         <b>Booking ID:</b> ${bookingId}</p>
      <p>See you soon! 🚀</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}

export function passwordResetTemplate({
  customerName,
  resetLink,
}: {
  customerName: string
  resetLink: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>🔐 Password Reset</h1>
      <p>Hi ${customerName},</p>
      <p>You requested a password reset for your Bookiji account.</p>
      <p>Click the button below to reset your password:</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${resetLink}" style="background:#007bff;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;">Reset Password</a>
      </div>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break:break-all;color:#666;font-size:12px;">${resetLink}</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}

export function emailVerificationTemplate({
  customerName,
  verifyLink,
}: {
  customerName: string
  verifyLink: string
}) {
  return `
  <html><body>
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px;background:#fff;border-radius:10px">
      <h1>✅ Verify Your Email</h1>
      <p>Hi ${customerName},</p>
      <p>Welcome to Bookiji! Please verify your email address to complete your registration.</p>
      <div style="text-align:center;margin:30px 0;">
        <a href="${verifyLink}" style="background:#28a745;color:#fff;padding:12px 24px;text-decoration:none;border-radius:5px;display:inline-block;">Verify Email</a>
      </div>
      <p>If you didn't create an account, you can safely ignore this email.</p>
      <p style="font-size:12px;color:#777">© ${new Date().getFullYear()} Bookiji Inc.</p>
    </div>
  </body></html>`;
}
