import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('../../src/scripts/ops-events-store', () => ({
  createEvent: vi.fn()
}))

import { runControlCommand } from '../../src/app/api/ops/controlplane/_lib/commands'

describe('command router', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('handles restart api command', async () => {
    const res = await runControlCommand({ command: 'restart api' })
    expect(res.accepted).toBe(true)
    expect(res.message).toContain('Restarted')
  })

  it('acknowledges unknown commands', async () => {
    const res = await runControlCommand({ command: 'unknown thing' })
    expect(res.accepted).toBe(true)
    expect(res.result).toBeDefined()
  })
})
