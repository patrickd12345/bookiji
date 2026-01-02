import { describe, it, expect, beforeEach } from 'vitest'
import { MicrosoftWebhookSignatureValidator } from '@/lib/calendar-sync/webhooks/validators'
import { createHmac } from 'crypto'

describe('MicrosoftWebhookSignatureValidator', () => {
  const secret = 'test-secret-key'
  const body = JSON.stringify({ 
    value: [{ 
      id: 'notification-id',
      changeType: 'created',
      resource: 'me/events'
    }]
  })

  beforeEach(() => {
    // Reset environment
    delete process.env.MICROSOFT_CALENDAR_WEBHOOK_SECRET
  })

  it('validates correct signature', async () => {
    // Compute valid signature
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    const validSignature = hmac.digest('hex')

    const validator = new MicrosoftWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Microsoft-Graph-Signature': validSignature,
      },
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(true)
  })

  it('rejects invalid signature', async () => {
    const validator = new MicrosoftWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Microsoft-Graph-Signature': 'invalid-signature',
      },
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(false)
  })

  it('rejects missing signature header', async () => {
    const validator = new MicrosoftWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(false)
  })

  it('rejects when secret is not configured', async () => {
    const validator = new MicrosoftWebhookSignatureValidator()
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Microsoft-Graph-Signature': 'any-signature',
      },
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(false)
  })

  it('handles empty body', async () => {
    const emptyBody = ''
    const hmac = createHmac('sha256', secret)
    hmac.update(emptyBody)
    const validSignature = hmac.digest('hex')

    const validator = new MicrosoftWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Microsoft-Graph-Signature': validSignature,
      },
      body: emptyBody,
    })

    const isValid = await validator.validate(request, emptyBody)
    expect(isValid).toBe(true)
  })

  it('handles object body (converts to JSON)', async () => {
    const bodyObject = { 
      value: [{ 
        id: 'notification-id',
        changeType: 'created'
      }]
    }
    const bodyString = JSON.stringify(bodyObject)
    
    const hmac = createHmac('sha256', secret)
    hmac.update(bodyString)
    const validSignature = hmac.digest('hex')

    const validator = new MicrosoftWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Microsoft-Graph-Signature': validSignature,
      },
    })

    const isValid = await validator.validate(request, bodyObject)
    expect(isValid).toBe(true)
  })
})
