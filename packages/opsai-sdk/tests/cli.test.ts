import { describe, expect, test, vi, beforeEach, afterEach } from 'vitest'
import { runCli } from '../src/cli/index'
import type { OpsAI } from '../src/client'

const createStubClient = (): OpsAI =>
  ({
    summary: vi.fn().mockResolvedValue({ ok: true }),
    metrics: vi.fn().mockResolvedValue({ analysis: 'ok' }),
    deployments: vi.fn().mockResolvedValue([]),
    incidents: vi.fn().mockResolvedValue([]),
    health: vi.fn().mockResolvedValue({ status: 'green' }),
    registerWebhook: vi.fn().mockResolvedValue({ url: 'https://example.com', createdAt: 'now' }),
    triggerTestWebhook: vi.fn().mockResolvedValue({ type: 'ops.test' })
  } as unknown as OpsAI)

describe('opsai CLI', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    logSpy.mockRestore()
    errorSpy.mockRestore()
  })

  test('prints summary', async () => {
    const client = createStubClient()
    const result = await runCli(['summary'], client)
    expect(result.code).toBe(0)
    expect(logSpy).toHaveBeenCalled()
  })

  test('rejects invalid metrics command', async () => {
    const client = createStubClient()
    const result = await runCli(['metrics', 'unknown'], client)
    expect(result.code).toBe(1)
    expect(logSpy).toHaveBeenCalled()
  })

  test('registers webhook with provided events', async () => {
    const client = createStubClient()
    const result = await runCli(['webhook', 'register', 'https://example.com/hook', 'health.degraded'], client)
    expect(result.code).toBe(0)
    expect((client.registerWebhook as any)).toHaveBeenCalledWith('https://example.com/hook', ['health.degraded'])
  })
})
