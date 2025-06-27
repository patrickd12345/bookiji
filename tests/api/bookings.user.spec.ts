/// <reference types="vitest" />
import { describe, it, expect, vi } from 'vitest'
import { GET as getUserBookingsHandler } from '../../src/app/api/bookings/user/route'

// Mock BookingEngine
vi.mock('../../lib/bookingEngine', () => ({
  BookingEngine: {
    getUserBookings: vi.fn().mockResolvedValue([
      {
        id: 'booking_1',
        customer_id: 'cust_1',
        vendor_id: 'vendor_1',
        service_id: 'service_1',
        status: 'pending',
        total_amount_cents: 100,
        created_at: '2024-05-01T10:00:00Z',
        services: { name: 'Haircut' },
        customers: { full_name: 'John Doe' },
        vendors: { full_name: 'Jane Stylist' }
      }
    ])
  }
}))

describe('GET /api/bookings/user', () => {
  it('returns user bookings', async () => {
    const req = new Request('http://localhost/api/bookings/user?userId=cust_1', {
      method: 'GET'
    })

    const res = await getUserBookingsHandler(req as any)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data.success).toBe(true)
    expect(data.bookings).toHaveLength(1)
    expect(data.bookings[0].id).toBe('booking_1')
    expect(data.count).toBe(1)
  })

  it('returns 400 when userId missing', async () => {
    const req = new Request('http://localhost/api/bookings/user', {
      method: 'GET'
    })

    const res = await getUserBookingsHandler(req as any)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data.error).toMatch(/User ID is required/)
  })
}) 