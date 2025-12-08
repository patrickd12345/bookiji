import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/ops/summary/route'

function makeRequest(url: string): any {
  const parsed = new URL(url)
  return {
    nextUrl: {
      origin: parsed.origin,
      searchParams: parsed.searchParams
    }
  } as any
}

describe('Ops summary null-deployment simulation', () => {
  it('returns a valid summary with empty deployments when forceEmptyDeployments=1', async () => {
    const req = makeRequest('http://localhost:3000/api/ops/summary?forceEmptyDeployments=1')
    const res = await GET(req)
    const json = await res.json()

    expect(Array.isArray(json.deployments)).toBe(true)
    expect(json.deployments).toEqual([])

    expect(json.health).toBeDefined()
    expect(json.health.overall).toBeDefined()

    expect(Array.isArray(json.sloSummary)).toBe(true)
    expect(json.sloSummary.length).toBe(0)

    expect(Array.isArray(json.incidents)).toBe(true)
    expect(Array.isArray(json.pendingActions)).toBe(true)

    expect(typeof json.message).toBe('string')
    expect(json.message).toContain('No recent deployments detected')
  })
})

