// @env-allow-legacy-dotenv
// test-mailersend.js
// IMPORTANT: This script reads credentials from environment variables
// Set MAILERSEND_SMTP_USER and MAILERSEND_SMTP_PASS before running
// Never commit credentials to version control!

import nodemailer from "nodemailer";
import dotenv from "dotenv";

// Load environment variables
dotenv.config();

async function main() {
  // Validate required environment variables
  const smtpUser = process.env.MAILERSEND_SMTP_USER || process.env.SMTP_USER;
  const smtpPass = process.env.MAILERSEND_SMTP_PASS || process.env.SMTP_PASS;
  const testEmail = process.env.TEST_EMAIL || "test@example.com";

  if (!smtpUser || !smtpPass) {
    console.error("❌ Error: Missing required environment variables");
    console.error("Please set MAILERSEND_SMTP_USER and MAILERSEND_SMTP_PASS");
    console.error("Optional: Set TEST_EMAIL to specify recipient (default: test@example.com)");
    process.exit(1);
  }

  // 1. Configure SMTP transport
  const transporter = nodemailer.createTransport({
    host: process.env.MAILERSEND_SMTP_HOST || "smtp.mailersend.net",
    port: Number(process.env.MAILERSEND_SMTP_PORT || 587),
    secure: false, // TLS is used but not SSL on 587
    auth: {
      user: smtpUser,
      pass: smtpPass,
    },
  });

  // 2. Send a test email
  try {
    const info = await transporter.sendMail({
      from: `"Bookiji Test" <${process.env.MAILERSEND_FROM_EMAIL || "no-reply@bookiji.com"}>`,
      to: testEmail,
      subject: "MailerSend SMTP test",
      text: "If you see this, MailerSend SMTP works! 🎉",
    });

    console.log("✅ Message sent:", info.messageId);
  } catch (err) {
    console.error("❌ Error sending mail:", err);
    process.exit(1);
  }
}

main();
