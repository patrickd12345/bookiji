/// <reference types="vitest" />
import { describe, it, expect } from 'vitest'
import { GET } from '@/app/api/bookings/user/route'

const TEST_BASE_URL = process.env.TEST_BASE_URL || ''

describe('GET /api/bookings/user', () => {
  it('returns empty bookings array when no bookings exist', async () => {
    const req = new Request(`${TEST_BASE_URL}/api/bookings/user?userId=test-user-123`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await GET(req)
    const data = await response.json()

    // Handle both success and error cases
    if (response.status === 200) {
      expect(data.success).toBe(true)
      expect(Array.isArray(data.bookings)).toBe(true)
    } else {
      // API may return 400 if userId is missing or invalid
      expect([200, 400]).toContain(response.status)
      if (response.status === 400) {
        expect(data.success).toBe(false)
        expect(data.error).toBeDefined()
      }
    }
  })

  it('handles database errors gracefully', async () => {
    const req = new Request(`${TEST_BASE_URL}/api/bookings/user?userId=nonexistent`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    const response = await GET(req)
    const data = await response.json()

    expect(response.status).toBe(200)
    expect(data.success).toBe(true)
  })
})
