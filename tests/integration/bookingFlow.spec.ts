import { describe, it, expect, beforeAll, vi } from 'vitest'
import { NextRequest } from 'next/server'

// Set up test environment variables
beforeAll(() => {
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
  process.env.STRIPE_SECRET_KEY = 'sk_test_123'
  process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test'
  process.env.OLLAMA_HOST = 'http://localhost:11434'
})

// Mock Supabase client directly
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      signUp: vi.fn(() => Promise.resolve({ 
        data: { 
          user: { 
            id: 'test-user-123', 
            email: 'test@example.com',
            email_confirmed_at: new Date().toISOString()
          } 
        }, 
        error: null 
      }))
    },
    from: vi.fn(() => ({
      insert: vi.fn(() => Promise.resolve({ 
        data: [{ 
          id: 'test-booking-123',
          customer_id: 'test-user-123',
          service: 'haircut',
          status: 'pending'
        }], 
        error: null 
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'test-user-123', role: 'customer' }, 
          error: null 
        }))
      }))
    }))
  }
}))

// Also mock for routes that use createClient
vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({
    auth: {
      signUp: vi.fn(() => Promise.resolve({ 
        data: { 
          user: { 
            id: 'test-user-123', 
            email: 'test@example.com',
            email_confirmed_at: new Date().toISOString()
          } 
        }, 
        error: null 
      }))
    },
    from: () => ({
      insert: vi.fn(() => Promise.resolve({ 
        data: [{ 
          id: 'test-booking-123',
          customer_id: 'test-user-123',
          service: 'haircut',
          status: 'pending'
        }], 
        error: null 
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null })),
        single: vi.fn(() => Promise.resolve({ 
          data: { id: 'test-user-123', role: 'customer' }, 
          error: null 
        }))
      }))
    })
  })
}))

// Mock fetch for Ollama API
global.fetch = vi.fn((url) => {
  if (url.includes('ollama') || url.includes('11434')) {
    return Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve({
        message: {
          content: "Hi there! I'm Bookiji, your AI booking assistant. I'd be happy to help you with your booking request."
        }
      })
    })
  }
  return Promise.resolve({
    ok: true,
    status: 200,
    json: () => Promise.resolve({ success: true })
  })
}) as unknown as typeof fetch

vi.mock('stripe', () => ({
  default: class MockStripe {
    paymentIntents = {
      create: vi.fn(() => Promise.resolve({ 
        id: 'pi_test_123',
        client_secret: 'pi_test_123_secret',
        amount: 100,
        currency: 'usd'
      }))
    }
    webhooks = {
      constructEvent: vi.fn(() => ({
        type: 'payment_intent.succeeded',
        data: { object: { id: 'pi_test_123' } }
      }))
    }
  }
}))

// Mock user service and referral service
vi.mock('@/lib/database', () => ({
  userService: {
    createUserProfile: vi.fn(() => Promise.resolve({ 
      id: 'test-user-123', 
      email: 'test@example.com' 
    }))
  }
}))

vi.mock('@/lib/referrals', () => ({
  referralService: {
    processReferral: vi.fn(() => Promise.resolve())
  }
}))

// Mock Ollama service
vi.mock('@/lib/ollama', () => ({
  ollamaService: {
    generate: vi.fn(() => Promise.resolve("Hi there! I'm Bookiji, your AI booking assistant. I'd be happy to help you with your booking request."))
  },
  BOOKIJI_PROMPTS: {
    bookingQuery: vi.fn((message) => `You are Bookiji AI. User says: ${message}`)
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
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(200)
    expect(data).toHaveProperty('response')
    expect(typeof data.response).toBe('string')
    expect(data.response.length).toBeGreaterThan(0)
    
    // Check for response time tracking
    expect(data).toHaveProperty('responseTime')
    expect(typeof data.responseTime).toBe('number')
    expect(data.responseTime).toBeGreaterThan(0)
    
    // Check if it's a fallback response
    if (data.fallback) {
      console.log('ℹ️ Using fallback response (AI service unavailable)')
    }
  }, 30000) // Increased timeout to 30 seconds

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
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(400)
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
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('AI chat handles empty message', async () => {
    const body = { 
      message: '', 
      slotDetails: { vendorId: 'vendor123', startTime: '2024-03-15T10:00:00Z' }
    }

    const req = new Request('http://localhost:3000/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const res = await aiChatRoute(req)
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('AI chat handles invalid message type', async () => {
    const body = { 
      message: 123 // Invalid type
    }

    const req = new Request('http://localhost:3000/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const res = await aiChatRoute(req)
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(400)
    expect(data).toHaveProperty('error')
  })

  it('AI chat handles requests without slot details gracefully', async () => {
    const body = { 
      message: 'I want to book an appointment'
    }

    const req = new Request('http://localhost:3000/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const res = await aiChatRoute(req)
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(200)
    expect(data).toHaveProperty('response')
    expect(data.success).toBe(true)
  })

  it('AI chat with booking slot context', async () => {
    const body = { 
      message: 'Can you help me book this appointment?',
      slotDetails: {
        vendorId: 'vendor123',
        startTime: '2024-03-15T10:00:00Z',
        duration: 60,
        serviceName: 'Haircut'
      }
    }

    const req = new Request('http://localhost:3000/api/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })

    const res = await aiChatRoute(req)
    expect(res).toBeTruthy()
    const data = await res!.json()

    expect(res!.status).toBe(200)
    expect(data).toHaveProperty('response')
    expect(typeof data.response).toBe('string')
    expect(data.response.length).toBeGreaterThan(0)
    
    // Check for response time tracking
    expect(data).toHaveProperty('responseTime')
    expect(typeof data.responseTime).toBe('number')
    expect(data.responseTime).toBeGreaterThan(0)
    
    // Check if it's a fallback response
    if (data.fallback) {
      console.log('ℹ️ Using fallback response (AI service unavailable)')
    }
  }, 30000) // Increased timeout to 30 seconds
}) 