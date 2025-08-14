import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Set up environment variables for integration tests
process.env.DEPLOY_ENV = 'test'

// Supabase Test Project (create a dedicated test project)
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://your-test-project.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'your-test-project-anon-key'

// Stripe Test Mode (using test API keys)
process.env.STRIPE_PUBLISHABLE_KEY = 'pk_test_your_key'
process.env.STRIPE_SECRET_KEY = 'sk_test_your_key'
process.env.STRIPE_WEBHOOK_SECRET = 'whsec_test_webhook_secret'

// LLM Test Endpoint
process.env.LOCAL_LLM_URL = 'http://localhost:11434' // Local Ollama for tests
process.env.LOCAL_LLM_MODEL = 'llama2:7b' // Smaller model for faster tests

// Test base URL
process.env.TEST_BASE_URL = 'http://localhost:3000'

// Mock fetch for tests
global.fetch = vi.fn()

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(() => Promise.resolve({ data: { session: null }, error: null })),
      getUser: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signUp: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: { user: null }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null })),
      onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })),
    },
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
          then: vi.fn((callback) => callback({ data: [], error: null }))
        })),
        or: vi.fn(() => ({
          order: vi.fn(() => ({
            then: vi.fn((callback) => callback({ data: [], error: null }))
          }))
        }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: null, error: null })),
      update: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
      delete: vi.fn(() => ({ eq: vi.fn(() => Promise.resolve({ data: null, error: null })) })),
    }))
  }
}))

// Cleanup after each test
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

// Mock Next.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    prefetch: vi.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
}
global.localStorage = localStorageMock as Storage

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})
