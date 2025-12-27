/**
 * Send Feedback SMS
 * 
 * Jarvis always replies to operator commands.
 */

import { logger } from '@/lib/logger'
import type { Environment } from '../types'

/**
 * Format feedback message for SMS
 */
export function formatFeedbackMessage(
  actionId: string | undefined,
  result: { success: boolean; message: string; reason?: string },
  env: Environment
): string {
  if (!actionId || !result.success) {
    // Refusal message
    return `⛔ Action refused\n\nReason: ${result.reason || result.message}\n\nNo changes made.`
  }

  // Success message
  const envLabel = env.toUpperCase()
  return `✅ Action executed (${envLabel})\n\n${result.message}\n\nReason: Operator SMS command\n\nNext check in 5 minutes.`
}

/**
 * Send feedback SMS to operator
 */
export async function sendFeedbackSMS(
  ownerPhone: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (
      process.env.TWILIO_ACCOUNT_SID &&
      process.env.TWILIO_AUTH_TOKEN &&
      process.env.TWILIO_FROM
    ) {
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            Authorization:
              'Basic ' +
              Buffer.from(
                `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
              ).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            From: process.env.TWILIO_FROM,
            To: ownerPhone,
            Body: message
          })
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        return {
          success: false,
          error: `Twilio error: ${response.status} - ${errorText}`
        }
      }

      return { success: true }
    } else {
      // Development fallback
      if (process.env.NODE_ENV === 'development') {
        logger.info('📱 [Jarvis Feedback SMS]', { message, recipient: ownerPhone })
        return { success: true }
      }

      return {
        success: false,
        error: 'Twilio not configured'
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

