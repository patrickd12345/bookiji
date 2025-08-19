import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/services/notificationQueue', () => {
  return {
    logAttempt: vi.fn(async () => {}),
    addToDeadLetterQueue: vi.fn(async () => {})
  }
})

import { retryNotification } from '@/lib/services/notificationRetry'
import * as queue from '@/lib/services/notificationQueue'

const failingSend = vi.fn(async () => ({ success: false, error: 'provider_fail' }))

describe('retryNotification exhaustion', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('adds to DLQ after max attempts', async () => {
    const notification: any = { type: 'email', recipient: 'u@test.com', template: 'verify_email', data: {} }
    const result = await retryNotification(failingSend, notification, 2, 1)
    expect(result.success).toBe(false)
    expect((queue.addToDeadLetterQueue as any)).toHaveBeenCalledWith(notification, 'max_attempts')
    // Two attempts should have been logged
    expect((queue.logAttempt as any)).toHaveBeenCalledTimes(2)
  })
})


