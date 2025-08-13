import { describe, it, expect, beforeEach, vi } from 'vitest'
import { retryNotification } from '@/lib/services/notificationRetry'
import {
  getDeadLetterQueueSize,
  clearDeadLetterQueue,
  getProviderLogs,
  clearProviderLogs
} from '@/lib/services/notificationQueue'

describe('notification retry', () => {
  beforeEach(() => {
    clearDeadLetterQueue()
    clearProviderLogs()
  })

  it('retries and moves to DLQ after max attempts', async () => {
    const sendFn = vi.fn().mockResolvedValue({ success: false, providerResponse: '500' })
    await retryNotification(sendFn, {
      type: 'email',
      recipient: 'a@example.com',
      template: 'booking_created',
      data: {}
    }, 5, 1)

    expect(sendFn).toHaveBeenCalledTimes(5)
    expect(getDeadLetterQueueSize()).toBe(1)
    expect(getProviderLogs().length).toBe(5)
  })

  it('stops retrying after success', async () => {
    const sendFn = vi
      .fn()
      .mockResolvedValueOnce({ success: false, providerResponse: '500' })
      .mockResolvedValueOnce({ success: true, providerResponse: '200' })

    const result = await retryNotification(
      sendFn,
      { type: 'email', recipient: 'a@example.com', template: 'booking_created', data: {} },
      5,
      1
    )

    expect(result.success).toBe(true)
    expect(sendFn).toHaveBeenCalledTimes(2)
    expect(getDeadLetterQueueSize()).toBe(0)
    expect(getProviderLogs().length).toBe(2)
  })
})

