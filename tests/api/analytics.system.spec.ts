/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/analytics/system/route'

const BASE_URL = 'http://localhost:3000'

describe('GET /api/analytics/system', () => {
  it('returns system metrics', async () => {
    const req = new Request(`${BASE_URL}/api/analytics/system`, { method: 'GET' })
    const res = await GET(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.ok).toBe(true)
    expect(Array.isArray(data.data)).toBe(true)
    expect(data.data.length).toBeGreaterThan(0)
  })
})
