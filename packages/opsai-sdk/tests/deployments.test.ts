import { describe, expect, test, vi } from 'vitest'
import { OpsAI } from '../src/client'

function mockFetch(body: any, status = 200) {
  return vi.fn().mockResolvedValue(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' }
    })
  )
}

describe('OpsAI deployments handling', () => {
  test('returns empty array when deployments is null', async () => {
    const client = new OpsAI({
      fetchImpl: mockFetch({ deployments: null })
    })
    const deployments = await client.deployments()
    expect(Array.isArray(deployments)).toBe(true)
    expect(deployments.length).toBe(0)
  })

  test('returns empty array when upstream is empty list', async () => {
    const client = new OpsAI({
      fetchImpl: mockFetch([])
    })
    const deployments = await client.deployments()
    expect(deployments).toEqual([])
  })
})
