import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import { NextRequest } from 'next/server'
import Stripe from 'stripe'

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
}) as any

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
vi.mock('../../../../lib/ollama', () => ({
  ollamaService: {
    generate: vi.fn(() => Promise.resolve("Hi there! I'm Bookiji, your AI booking assistant. I'd be happy to help you with your booking request."))
  },
  BOOKIJI_PROMPTS: {
    bookingQuery: vi.fn((message) => `You are Bookiji AI. User says: ${message}`)
  }
}))

// Import API route handlers directly
import { POST as registerRoute } from '@/app/api/auth/register/route'
import { POST as aiChatRoute } from '@/app/api/ai-chat/route'
import { POST as bookingCreateRoute } from '@/app/api/bookings/create/route'
import { POST as paymentIntentRoute } from '@/app/api/payments/create-payment-intent/route'
import { POST as stripeWebhookRoute } from '@/app/api/payments/webhook/route'

// Initialize Stripe test client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20'
})

describe('INTEGRATION: End-to-end booking flow', () => {
  const BASE = process.env.TEST_BASE_URL || 'http://localhost:3000'
  let userId: string
  let bookingId: string
  let paymentIntentId: string

  beforeAll(async () => {
    // Clean up any test data from previous runs
    // This would use real test project APIs to clean state
  })

  it('registers a new user', async () => {
    const testEmail = `test.${Date.now()}@example.com`
    const body = { 
      email: testEmail, 
      password: 'TestPassword123!',
      metadata: { test: true }
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/auth/register`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await registerRoute(req)
    const data = await res.json()

    expect(res.status).toBeLessThan(300)
    expect(data).toHaveProperty('user')
    expect(data.user).toHaveProperty('id')
    userId = data.user.id
  })

  it('converses with AI booking assistant', async () => {
    const body = { 
      userId, 
      message: 'I need a haircut tomorrow at 10 AM',
      metadata: { test: true }
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

  it('creates a booking', async () => {
    const body = {
      userId,
      vendorId: 'test_vendor_1', // Use known test vendor ID
      serviceId: 'test_service_1', // Use known test service ID
      slotId: 'test_slot_1', // Use known test slot ID
      metadata: { test: true }
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/bookings/create`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await bookingCreateRoute(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('bookingId')
    bookingId = data.bookingId
  })

  it('creates a payment intent using Stripe test mode', async () => {
    const body = { 
      bookingId,
      metadata: { test: true }
    }
    
    const req = new NextRequest(new Request(`${BASE}/api/payments/create-payment-intent`, {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json' }
    }))

    const res = await paymentIntentRoute(req)
    const data = await res.json()

    expect(res.status).toBe(200)
    expect(data).toHaveProperty('clientSecret')
    expect(data.clientSecret).toMatch(/^pi_test_/)
    paymentIntentId = data.paymentIntentId
  })

  it('handles Stripe webhook confirmation', async () => {
    // Create a test webhook event
    const webhookEvent = {
      id: `evt_test_${Date.now()}`,
      object: 'event',
      api_version: '2024-06-20',
      created: Math.floor(Date.now() / 1000),
      type: 'payment_intent.succeeded',
      data: {
        object: {
          id: paymentIntentId,
          object: 'payment_intent',
          status: 'succeeded',
          metadata: { bookingId }
        }
      }
    }

    const req = new NextRequest(new Request(`${BASE}/api/payments/webhook`, {
      method: 'POST',
      body: JSON.stringify(webhookEvent),
      headers: { 
        'Content-Type': 'application/json',
        // In test mode, we'll configure the webhook handler to skip signature verification
        'Stripe-Signature': 'test_mode=true'
      }
    }))

    const res = await stripeWebhookRoute(req)
    expect(res.status).toBeLessThan(300)

    // Verify the booking was confirmed in the test database
    const bookingStatus = await stripe.paymentIntents.retrieve(paymentIntentId)
    expect(bookingStatus.metadata.status).toBe('confirmed')
  })

  afterAll(async () => {
    // Clean up test data
    // This would use real test project APIs to clean up
  })
}) 