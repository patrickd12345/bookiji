import { describe, it, expect } from 'vitest'
import { buildPushPayload } from '@/lib/notifications/pushPayload'

describe('reminder notifications', () => {
  it('includes vendor expectations verbatim when provided', () => {
    const payload = buildPushPayload('reminder', {
      service: 'Test Service',
      time: '10:00 AM',
      expectations: 'Arrive 10 minutes early'
    })

    expect(payload.body).toContain('Arrive 10 minutes early')
  })

  it('keeps reminder copy informational', () => {
    const payload = buildPushPayload('reminder', {
      service: 'Test Service',
      time: '10:00 AM',
      expectations: 'Arrive 10 minutes early'
    })

    expect(payload.body).not.toMatch(/penalt|fee|refund|enforc|consequence/i)
  })
})
