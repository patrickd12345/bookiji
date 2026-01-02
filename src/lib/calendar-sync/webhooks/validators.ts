/**
 * Webhook Signature Validators for Calendar Providers
 * 
 * Implements provider-specific signature validation for Google Calendar
 * and Microsoft/Outlook calendar webhooks.
 */

import { createHmac } from 'crypto'

/**
 * Interface for webhook signature validation
 */
export interface WebhookSignatureValidator {
  validate(request: Request, body: string | unknown): Promise<boolean>
}

/**
 * Google Calendar Webhook Signature Validator
 * 
 * Google Calendar webhooks use HMAC-SHA256 to sign the request body.
 * The signature is provided in the X-Goog-Signature header.
 * 
 * Reference: https://developers.google.com/calendar/api/guides/push
 */
export class GoogleWebhookSignatureValidator implements WebhookSignatureValidator {
  private secret: string

  constructor(secret?: string) {
    this.secret = secret || process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET || ''
    if (!this.secret) {
      console.warn('GOOGLE_CALENDAR_WEBHOOK_SECRET not configured - webhook validation will fail')
    }
  }

  async validate(request: Request, body: string | unknown): Promise<boolean> {
    // If secret is not configured, fail validation (secure by default)
    if (!this.secret) {
      return false
    }

    // Get signature from header
    const signature = request.headers.get('X-Goog-Signature')
    if (!signature) {
      return false
    }

    // Convert body to string if needed
    let bodyString: string
    if (typeof body === 'string') {
      bodyString = body
    } else {
      bodyString = JSON.stringify(body)
    }

    // Compute HMAC-SHA256 signature
    const hmac = createHmac('sha256', this.secret)
    hmac.update(bodyString)
    const computedSignature = hmac.digest('hex')

    // Compare signatures (constant-time comparison to prevent timing attacks)
    return this.constantTimeEquals(signature, computedSignature)
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}

/**
 * Microsoft/Outlook Calendar Webhook Signature Validator
 * 
 * Microsoft Graph webhooks use HMAC-SHA256 to sign the request body.
 * The signature is provided in the X-Microsoft-Graph-Signature header.
 * 
 * Reference: https://learn.microsoft.com/en-us/graph/webhooks
 */
export class MicrosoftWebhookSignatureValidator implements WebhookSignatureValidator {
  private secret: string

  constructor(secret?: string) {
    this.secret = secret || process.env.MICROSOFT_CALENDAR_WEBHOOK_SECRET || ''
    if (!this.secret) {
      console.warn('MICROSOFT_CALENDAR_WEBHOOK_SECRET not configured - webhook validation will fail')
    }
  }

  async validate(request: Request, body: string | unknown): Promise<boolean> {
    // If secret is not configured, fail validation (secure by default)
    if (!this.secret) {
      return false
    }

    // Get signature from header
    const signature = request.headers.get('X-Microsoft-Graph-Signature')
    if (!signature) {
      return false
    }

    // Convert body to string if needed
    let bodyString: string
    if (typeof body === 'string') {
      bodyString = body
    } else {
      bodyString = JSON.stringify(body)
    }

    // Compute HMAC-SHA256 signature
    const hmac = createHmac('sha256', this.secret)
    hmac.update(bodyString)
    const computedSignature = hmac.digest('hex')

    // Compare signatures (constant-time comparison to prevent timing attacks)
    return this.constantTimeEquals(signature, computedSignature)
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }

    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}

/**
 * Get validator for a specific provider
 */
export function getValidatorForProvider(
  provider: 'google' | 'microsoft'
): WebhookSignatureValidator {
  switch (provider) {
    case 'google':
      return new GoogleWebhookSignatureValidator()
    case 'microsoft':
      return new MicrosoftWebhookSignatureValidator()
    default:
      throw new Error(`Unknown provider: ${provider}`)
  }
}
