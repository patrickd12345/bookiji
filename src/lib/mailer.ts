import nodemailer from "nodemailer";
import { logger } from "@/lib/logger";

function assertMailerSendEnv() {
  const smtpUser = process.env.MAILERSEND_SMTP_USER || process.env.SMTP_USER
  const smtpPass = process.env.MAILERSEND_SMTP_PASS || process.env.SMTP_PASS
  const fromEmail = process.env.MAILERSEND_FROM_EMAIL || smtpUser

  const missing: string[] = []
  if (!smtpUser) missing.push('MAILERSEND_SMTP_USER (or SMTP_USER)')
  if (!smtpPass) missing.push('MAILERSEND_SMTP_PASS (or SMTP_PASS)')
  if (!fromEmail) missing.push('MAILERSEND_FROM_EMAIL')

  if (missing.length > 0) {
    throw new Error(`Missing email env vars: ${missing.join(', ')}`)
  }
}

let _transporter: nodemailer.Transporter | null = null
function getTransporter() {
  if (_transporter) return _transporter
  assertMailerSendEnv()
  _transporter = nodemailer.createTransport({
    host: process.env.MAILERSEND_SMTP_HOST || process.env.SMTP_HOST || 'smtp.mailersend.net',
    port: Number(process.env.MAILERSEND_SMTP_PORT || process.env.SMTP_PORT) || 587,
    secure: false,
    auth: {
      user: process.env.MAILERSEND_SMTP_USER || process.env.SMTP_USER,
      pass: process.env.MAILERSEND_SMTP_PASS || process.env.SMTP_PASS,
    },
  })
  return _transporter
}

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
    const transporter = getTransporter()
    const result = await transporter.sendMail({
      from: `"${process.env.MAILERSEND_FROM_NAME || 'Bookiji'}" <${
        process.env.MAILERSEND_FROM_EMAIL ||
        process.env.MAILERSEND_SMTP_USER ||
        process.env.SMTP_USER
      }>`,
      to,
      subject,
      html,
    });
    
    logger.info('Email sent successfully to:', { to, messageId: result.messageId });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to send email to:', to, 'Error:', errorMessage);
    throw error;
  }
}
