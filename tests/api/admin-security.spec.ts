import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { POST as setupTestDataPost } from '@/app/api/setup-test-data/route'
import { GET as checkTablesGet } from '@/app/api/check-tables/route'
import { POST as createProfilesTablePost } from '@/app/api/create-profiles-table/route'

// Mock the environment
const ORIGINAL_CRON_SECRET = process.env.CRON_SECRET

describe('Admin API Security', () => {
  beforeEach(() => {
    process.env.CRON_SECRET = 'test-secret-key'
    vi.resetAllMocks()

    // Silence console logs during tests
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    process.env.CRON_SECRET = ORIGINAL_CRON_SECRET
    vi.restoreAllMocks()
  })

  describe('POST /api/setup-test-data', () => {
    it('returns 401 when no authorization header is present', async () => {
      const req = new NextRequest('http://localhost/api/setup-test-data', { method: 'POST' })
      const res = await setupTestDataPost(req)
      expect(res.status).toBe(401)
      const data = await res.json()
      expect(data.error).toBe('Unauthorized')
    })

    it('returns 401 when authorization header is invalid', async () => {
      const req = new NextRequest('http://localhost/api/setup-test-data', {
        method: 'POST',
        headers: { authorization: 'Bearer wrong-key' }
      })
      const res = await setupTestDataPost(req)
      expect(res.status).toBe(401)
    })
  })

  describe('GET /api/check-tables', () => {
    it('returns 401 when no authorization header is present', async () => {
      const req = new NextRequest('http://localhost/api/check-tables', { method: 'GET' })
      const res = await checkTablesGet(req)
      expect(res.status).toBe(401)
    })
  })

  describe('POST /api/create-profiles-table', () => {
    it('returns 401 when no authorization header is present', async () => {
      const req = new NextRequest('http://localhost/api/create-profiles-table', { method: 'POST' })
      const res = await createProfilesTablePost(req)
      expect(res.status).toBe(401)
    })
  })
})
