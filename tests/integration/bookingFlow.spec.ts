import { describe, it, expect, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Mock the ollama service
vi.mock('@/lib/ollama', () => ({
  ollamaService: {
    generate: vi.fn(() => Promise.resolve('Mock AI response for booking query'))
  },
  BOOKIJI_PROMPTS: {
    bookingQuery: vi.fn(() => 'Mock prompt')
  }
}))

// Mock Supabase client with comprehensive mocks
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ data: { id: 'test-booking-id' }, error: null })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      upsert: vi.fn(() => Promise.resolve({ data: { id: 'test-user-id' }, error: null })),
      auth: {
        signUp: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user-id' } }, error: null }))
      }
    }))
  }
}))

// Mock Stripe
vi.mock('stripe', () => {
  const mockStripe = vi.fn().mockImplementation(() => ({
    paymentIntents: {
      create: vi.fn(() => Promise.resolve({
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret_test'
      }))
    }
  }))
  return { default: mockStripe }
})

// Mock the booking engine
vi.mock('@/lib/bookingEngine', () => ({
  createBooking: vi.fn(() => Promise.resolve({ success: true, bookingId: 'test-booking-id' })),
  getUserBookings: vi.fn(() => Promise.resolve({ success: true, bookings: [] }))
}))

// Mock the payment handler
vi.mock('@/lib/paymentsCreateIntentHandler', () => ({
  createPaymentsCreateIntentHandler: vi.fn(() => ({
    handle: vi.fn(() => Promise.resolve({
      json: () => Promise.resolve({ success: true, clientSecret: 'pi_test_123_secret_test' })
    }))
  }))
}))

// Import API route handlers directly
import { POST as aiChatRoute } from '@/app/api/ai-chat/route'

describe('INTEGRATION: Core functionality tests', () => {
  const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'

  it('AI chat responds correctly', async () => {
    const body = { 
      message: 'I need a haircut tomorrow at 10 AM'
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/ai-chat`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await aiChatRoute(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('response')
    expect(typeof data.response).toBe('string')
    expect(data.response.length).toBeGreaterThan(0)
  })

  it('AI chat handles missing message gracefully', async () => {
    const body = { 
      // Missing message
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/ai-chat`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await aiChatRoute(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('AI chat handles invalid message type', async () => {
    const body = { 
      message: 123 // Invalid type
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/ai-chat`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await aiChatRoute(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('AI chat handles empty message', async () => {
    const body = { 
      message: ''
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/ai-chat`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await aiChatRoute(req)
    const data = await res.json()

    expect(res.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('AI chat generates meaningful responses', async () => {
    const body = { 
      message: 'Find me a massage therapist near me'
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/ai-chat`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await aiChatRoute(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('response')
    expect(typeof data.response).toBe('string')
    expect(data.response.length).toBeGreaterThan(10) // Should be meaningful
  })
}) 