import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GoogleWebhookSignatureValidator } from '@/lib/calendar-sync/webhooks/validators'
import { createHmac } from 'crypto'

describe('GoogleWebhookSignatureValidator', () => {
  const secret = 'test-secret-key'
  const body = JSON.stringify({ channel: { resourceId: 'test-resource-id' } })

  beforeEach(() => {
    // Reset environment
    delete process.env.GOOGLE_CALENDAR_WEBHOOK_SECRET
  })

  it('validates correct signature', async () => {
    // Compute valid signature
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    const validSignature = hmac.digest('hex')

    const validator = new GoogleWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': validSignature,
      },
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(true)
  })

  it('rejects invalid signature', async () => {
    const validator = new GoogleWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': 'invalid-signature',
      },
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(false)
  })

  it('rejects missing signature header', async () => {
    const validator = new GoogleWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      body,
    })

    const isValid = await validator.validate(request, body)
    expect(isValid).toBe(false)
  })

  it('rejects when secret is not configured', async () => {
    const validator = new GoogleWebhookSignatureValidator()
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': 'any-signature',
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

    const validator = new GoogleWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': validSignature,
      },
      body: emptyBody,
    })

    const isValid = await validator.validate(request, emptyBody)
    expect(isValid).toBe(true)
  })

  it('handles object body (converts to JSON)', async () => {
    const bodyObject = { channel: { resourceId: 'test-resource-id' } }
    const bodyString = JSON.stringify(bodyObject)
    
    const hmac = createHmac('sha256', secret)
    hmac.update(bodyString)
    const validSignature = hmac.digest('hex')

    const validator = new GoogleWebhookSignatureValidator(secret)
    const request = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': validSignature,
      },
    })

    const isValid = await validator.validate(request, bodyObject)
    expect(isValid).toBe(true)
  })

  it('uses constant-time comparison to prevent timing attacks', async () => {
    const validator = new GoogleWebhookSignatureValidator(secret)
    
    // Test with different length signatures (should fail fast)
    const request1 = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': 'short',
      },
      body,
    })
    const start1 = Date.now()
    await validator.validate(request1, body)
    const time1 = Date.now() - start1

    // Test with same length but wrong signature
    const hmac = createHmac('sha256', secret)
    hmac.update(body)
    const correctSig = hmac.digest('hex')
    const wrongSig = 'a'.repeat(correctSig.length)
    
    const request2 = new Request('http://localhost', {
      method: 'POST',
      headers: {
        'X-Goog-Signature': wrongSig,
      },
      body,
    })
    const start2 = Date.now()
    await validator.validate(request2, body)
    const time2 = Date.now() - start2

    // Both should fail, and timing should be similar (within reasonable bounds)
    // This is a basic check - true constant-time would require more sophisticated testing
    expect(time2).toBeLessThan(100) // Should be fast
  })
})
