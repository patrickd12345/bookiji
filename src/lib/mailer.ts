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

/**
 * Retry helper with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | unknown;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // Don't retry on the last attempt
      if (attempt === maxRetries) {
        break;
      }
      
      // Calculate exponential backoff delay: 1s, 2s, 4s
      const delay = initialDelay * Math.pow(2, attempt);
      logger.warn(`Email send attempt ${attempt + 1} failed, retrying in ${delay}ms...`, {
        error: error instanceof Error ? error.message : 'Unknown error',
        attempt: attempt + 1,
        maxRetries,
      });
      
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  throw lastError;
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
  const maxRetries = Number(process.env.MAILERSEND_MAX_RETRIES || 3);
  
  return retryWithBackoff(async () => {
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
  }, maxRetries).catch((error) => {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Failed to send email after retries:', { 
      to, 
      error: errorMessage,
      maxRetries,
    });
    throw error;
  });
}
