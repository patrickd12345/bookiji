import { describe, expect, test, vi } from 'vitest'
import { OpsAICache } from '../src/cache'

describe('OpsAICache', () => {
  test('returns cached value before TTL expires', async () => {
    vi.useFakeTimers()
    const cache = new OpsAICache(1000)
    cache.set('k', 42)
    expect(cache.get<number>('k')).toBe(42)
    vi.advanceTimersByTime(500)
    expect(cache.get<number>('k')).toBe(42)
    vi.useRealTimers()
  })

  test('expires entries after TTL', async () => {
    vi.useFakeTimers()
    const cache = new OpsAICache(100)
    cache.set('ephemeral', 'x')
    vi.advanceTimersByTime(200)
    expect(cache.get('ephemeral')).toBeUndefined()
    vi.useRealTimers()
  })

  test('getOrSet caches producer result', async () => {
    const cache = new OpsAICache(500)
    const producer = vi.fn().mockResolvedValue('computed')
    const first = await cache.getOrSet('p', producer)
    const second = await cache.getOrSet('p', producer)
    expect(first).toBe('computed')
    expect(second).toBe('computed')
    expect(producer).toHaveBeenCalledTimes(1)
  })
})
