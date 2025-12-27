import nodemailer from "nodemailer";
import { logger } from '@/lib/logger';

const transporter = nodemailer.createTransport({
  host: process.env.MAILERSEND_SMTP_HOST,
  port: Number(process.env.MAILERSEND_SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.MAILERSEND_SMTP_USER,
    pass: process.env.MAILERSEND_SMTP_PASS,
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
    const result = await transporter.sendMail({
      from: `"${process.env.MAILERSEND_FROM_NAME}" <${process.env.MAILERSEND_FROM_EMAIL}>`,
      to,
      subject,
      html,
    });
    
    logger.info('Email sent successfully', { to, messageId: result.messageId });
    return result;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send email', new Error(errorMessage), { to });
    throw error;
  }
}
