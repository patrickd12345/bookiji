/**
 * Email Inbox Testing Helper
 * 
 * Provides utilities for testing email delivery in CI/CD.
 * Uses MailHog or mock SMTP server for testing.
 */

import { APIRequestContext } from '@playwright/test'

export interface EmailMessage {
  from: string
  to: string
  subject: string
  body: string
  html?: string
  timestamp: Date
}

export class EmailInbox {
  private baseUrl: string
  private request: APIRequestContext | null

  constructor(
    baseUrl: string = process.env.MAILHOG_URL || 'http://localhost:8025',
    request?: APIRequestContext
  ) {
    this.baseUrl = baseUrl
    this.request = request || null
  }

  /**
   * Get all emails from the inbox
   */
  async getAllEmails(): Promise<EmailMessage[]> {
    try {
      const url = `${this.baseUrl}/api/v2/messages`
      const response = this.request
        ? await this.request.get(url)
        : await fetch(url).then(r => ({ json: () => r.json(), ok: r.ok }))
      
      const data = await response.json()
      
      return data.items.map((item: any) => ({
        from: item.Content.Headers.From?.[0] || '',
        to: item.Content.Headers.To?.[0] || '',
        subject: item.Content.Headers.Subject?.[0] || '',
        body: item.Content.Body || '',
        html: item.Content.HTMLBody || '',
        timestamp: new Date(item.Created)
      }))
    } catch (error) {
      console.warn('MailHog not available, using mock inbox')
      return []
    }
  }

  /**
   * Get emails matching a filter
   */
  async getEmails(filter: {
    to?: string
    from?: string
    subject?: string
    after?: Date
  }): Promise<EmailMessage[]> {
    const allEmails = await this.getAllEmails()
    
    return allEmails.filter(email => {
      if (filter.to && !email.to.includes(filter.to)) return false
      if (filter.from && !email.from.includes(filter.from)) return false
      if (filter.subject && !email.subject.includes(filter.subject)) return false
      if (filter.after && email.timestamp < filter.after) return false
      return true
    })
  }

  /**
   * Wait for an email to arrive
   */
  async waitForEmail(
    filter: {
      to?: string
      from?: string
      subject?: string
    },
    timeout: number = 10000
  ): Promise<EmailMessage | null> {
    const startTime = Date.now()
    
    while (Date.now() - startTime < timeout) {
      const emails = await this.getEmails(filter)
      if (emails.length > 0) {
        return emails[0]
      }
      await new Promise(resolve => setTimeout(resolve, 500))
    }
    
    return null
  }

  /**
   * Clear all emails from inbox
   */
  async clearInbox(): Promise<void> {
    try {
      const url = `${this.baseUrl}/api/v1/messages`
      if (this.request) {
        await this.request.delete(url)
      } else {
        await fetch(url, { method: 'DELETE' })
      }
    } catch (error) {
      // MailHog not available, ignore
    }
  }

  /**
   * Extract verification link from email
   */
  extractVerificationLink(email: EmailMessage): string | null {
    const linkMatch = email.html?.match(/href="([^"]+)"/) || 
                     email.body.match(/https?:\/\/[^\s]+/)
    return linkMatch ? linkMatch[1] : null
  }

  /**
   * Extract OTP code from email
   */
  extractOTP(email: EmailMessage): string | null {
    const otpMatch = email.body.match(/\b\d{6}\b/) || 
                    email.html?.match(/\b\d{6}\b/)
    return otpMatch ? otpMatch[0] : null
  }
}

export const emailInbox = (baseUrl?: string, request?: APIRequestContext) => 
  new EmailInbox(baseUrl, request)


























