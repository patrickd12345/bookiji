import { describe, it, expect } from 'vitest'
import { POST } from '@/app/api/availability/search/route'
import { NextRequest } from 'next/server'

type SearchBody = { service_type?: string; location?: string; date?: string }

const mkReq = (body: SearchBody) => new Request('https://example.com/api/availability/search', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify(body)
})

describe('POST /api/availability/search error validation', () => {
  it('400 when missing required params', async () => {
    const res = await POST(mkReq({}) as unknown as NextRequest)
    expect(res?.status).toBe(400)
  })
})


