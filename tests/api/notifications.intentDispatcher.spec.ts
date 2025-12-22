import { describe, it, expect } from 'vitest'
import { buildIdempotencyKey } from '@/lib/notifications/intentDispatcher'

describe('notification intent idempotency', () => {
  it('produces stable keys for equivalent payloads', () => {
    const key1 = buildIdempotencyKey({
      intentType: 'booking_confirmed',
      userId: 'user-1',
      payload: { a: 1, b: 2 }
    })

    const key2 = buildIdempotencyKey({
      intentType: 'booking_confirmed',
      userId: 'user-1',
      payload: { b: 2, a: 1 }
    })

    expect(key1).toBe(key2)
  })

  it('changes keys when payload changes', () => {
    const key1 = buildIdempotencyKey({
      intentType: 'booking_confirmed',
      userId: 'user-1',
      payload: { a: 1, b: 2 }
    })

    const key2 = buildIdempotencyKey({
      intentType: 'booking_confirmed',
      userId: 'user-2',
      payload: { a: 1, b: 2 }
    })

    expect(key1).not.toBe(key2)
  })
})
