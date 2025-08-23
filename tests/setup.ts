import '@testing-library/jest-dom'
import { vi } from 'vitest'
import { cleanup, waitFor } from '@testing-library/react'
import { act } from 'react-dom/test-utils'

// Global test utilities to reduce act() warnings
;(global as any).waitFor = waitFor
;(global as any).act = act

// Suppress console warnings for act() in tests
const originalError = console.error
beforeAll(() => {
  console.error = (...args) => {
    if (
      typeof args[0] === 'string' &&
      args[0].includes('Warning: An update to') &&
      args[0].includes('inside a test was not wrapped in act')
    ) {
      return
    }
    originalError.call(console, ...args)
  }
})

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

// Mock useI18n hook
vi.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string, params?: any) => {
      const translations: Record<string, string> = {
        'home.headline': 'Universal Booking Platform',
        'home.tagline': 'Book any service, anywhere, instantly. One-click booking with AI assistance and $1.00 commitment fee guarantee.',
        'home.search_placeholder': 'What service do you need?',
        'home.feature_grid.chat.title': 'Real-Time Booking Chat',
        'home.commitment_banner': 'Only $1.00 commitment fee • No hidden charges',
        'home.feature_grid.title': 'Platform Features',
        'home.feature_grid.chat.desc': 'Try our AI booking assistant',
        'home.feature_grid.radius.desc': 'AI-powered radius scaling',
        'home.core.commitment.title': '$1 Commitment Fee',
        'home.core.commitment.desc': 'Minimal upfront cost',
        'home.core.assistant.title': 'AI Assistant',
        'home.core.assistant.desc': 'Smart booking help',
        'home.core.map.title': 'Map Protection',
        'home.core.map.desc': 'Location privacy',
        'home.core.guarantees.title': 'Booking Guarantees',
        'home.core.guarantees.desc': 'Reliable service',
        'home.launch_stats.title': 'Global Launch',
        'home.launch_stats.countries': 'Countries',
        'home.launch_stats.currencies': 'Currencies',
        'home.launch_stats.languages': 'Languages',
        'home.cta.title': 'Ready to Get Started?',
        'home.cta.subtitle': 'Join the global beta today',
        'buttons.search': 'Search',
        'buttons.start_chat': 'Start Chat',
        'buttons.watch_demo': 'Watch Demo',
        'buttons.book_appointment': 'Book Appointment',
        'buttons.offer_services': 'Offer Services',
        'buttons.start_interactive_tour': 'Start Interactive Tour',
        'buttons.close': 'Close',
        'cta.get_started': 'Get Started',
        'chat.header': 'AI Chat',
        'demo.platform_title': 'Bookiji Platform Demo',
        'demo.experience_title': 'Experience the Future of Booking',
        'demo.experience_body': 'See how our platform makes booking services effortless and secure.',
        'demo.step1.title': 'Search & Discover',
        'demo.step1.body': 'Find services in your area with our intelligent search.',
        'demo.step2.title': 'AI-Powered Matching',
        'demo.step2.body': 'Our AI helps you find the perfect service provider.',
        'demo.step3.title': 'Secure Booking',
        'demo.step3.body': 'Book with confidence using our $1 commitment guarantee.',
        'demo.step4.title': 'Real-Time Updates',
        'demo.step4.body': 'Stay informed with live booking status and notifications.',
        'locale.change_language': 'Change language',
        'welcome': 'Welcome to Bookiji'
      }
      return translations[key] || key
    },
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
    setLocale: vi.fn(),
    locale: 'en-US'
  })
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
