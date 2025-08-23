// src/utils/sendEmail.ts
import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.MAILERSEND_SMTP_HOST,
  port: Number(process.env.MAILERSEND_SMTP_PORT) || 587,
  secure: false, // upgrade later with STARTTLS
  auth: {
    user: process.env.MAILERSEND_SMTP_USER,
    pass: process.env.MAILERSEND_SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // allow self-signed certs if needed
  },
});

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}) {
  try {
    const info = await transporter.sendMail({
      from: `"${process.env.MAILERSEND_FROM_NAME || 'Bookiji'}" <${process.env.MAILERSEND_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });

    console.log("📧 Email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Email failed:", err);
    return { success: false, error: err };
  }
}

// Type-safe wrapper functions for common email types
export async function sendBookingConfirmation({
  customerEmail,
  customerName,
  vendorName,
  serviceName,
  bookingDate,
  bookingTime,
  bookingId,
}: {
  customerEmail: string;
  customerName: string;
  vendorName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  bookingId: string;
}) {
  const { bookingConfirmationTemplate } = await import('./emailTemplates');
  
  const html = bookingConfirmationTemplate({
    customerName,
    vendorName,
    serviceName,
    bookingDate,
    bookingTime,
    bookingId,
  });

  return sendEmail({
    to: customerEmail,
    subject: "✅ Your booking is confirmed",
    html,
  });
}

export async function sendVendorNotification({
  vendorEmail,
  vendorName,
  customerName,
  serviceName,
  bookingDate,
  bookingTime,
  bookingId,
}: {
  vendorEmail: string;
  vendorName: string;
  customerName: string;
  serviceName: string;
  bookingDate: string;
  bookingTime: string;
  bookingId: string;
}) {
  const { vendorNotificationTemplate } = await import('./emailTemplates');
  
  const html = vendorNotificationTemplate({
    vendorName,
    customerName,
    serviceName,
    bookingDate,
    bookingTime,
    bookingId,
  });

  return sendEmail({
    to: vendorEmail,
    subject: "📅 New booking received",
    html,
  });
}

export async function sendPasswordReset({
  userEmail,
  userName,
  resetLink,
}: {
  userEmail: string;
  userName: string;
  resetLink: string;
}) {
  const { passwordResetTemplate } = await import('./emailTemplates');
  
  const html = passwordResetTemplate({
    customerName: userName,
    resetLink,
  });

  return sendEmail({
    to: userEmail,
    subject: "🔐 Reset your Bookiji password",
    html,
  });
}

export async function sendEmailVerification({
  userEmail,
  userName,
  verifyLink,
}: {
  userEmail: string;
  userName: string;
  verifyLink: string;
}) {
  const { emailVerificationTemplate } = await import('./emailTemplates');
  
  const html = emailVerificationTemplate({
    customerName: userName,
    verifyLink,
  });

  return sendEmail({
    to: userEmail,
    subject: "✅ Verify your Bookiji email",
    html,
  });
}
