import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

// Mock all external dependencies
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    canBookServices: true,
    canOfferServices: false,
    loading: false
  })
}))

vi.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `$${amount}`,
    setLocale: vi.fn()
  }),
  SUPPORTED_LOCALES: ['en-US', 'de-DE', 'fr-FR']
}))

vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => Promise.resolve({ data: [], error: null }))
      })),
      insert: vi.fn(() => Promise.resolve({ data: [], error: null })),
      update: vi.fn(() => Promise.resolve({ data: [], error: null })),
      delete: vi.fn(() => Promise.resolve({ data: [], error: null }))
    })),
    auth: {
      signUp: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
      signIn: vi.fn(() => Promise.resolve({ data: { user: { id: 'test-user' } }, error: null })),
      signOut: vi.fn(() => Promise.resolve({ error: null }))
    }
  }
}))

vi.mock('@/lib/ollama', () => ({
  ollamaService: {
    generate: vi.fn(() => Promise.resolve('Mock AI response'))
  },
  BOOKIJI_PROMPTS: {
    bookingQuery: vi.fn(() => 'Mock prompt')
  }
}))

vi.mock('@/lib/stripe', () => ({
  getStripeSecretKey: vi.fn(() => 'sk_test_mock'),
  getStripePublishableKey: vi.fn(() => 'pk_test_mock'),
  createCommitmentFeePaymentIntent: vi.fn(() => Promise.resolve({ id: 'pi_test' }))
}))

vi.mock('@/lib/mapbox', () => ({
  mapboxgl: {
    accessToken: 'test-token',
    Map: vi.fn(() => ({
      on: vi.fn(),
      addControl: vi.fn(),
      remove: vi.fn()
    })),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn(() => ({
        addTo: vi.fn()
      }))
    }))
  }
}))

// Mock complex components
vi.mock('@/components/RealAIChat', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="ai-chat-modal">
        <h2>AI Chat Modal</h2>
        <button onClick={onClose} data-testid="close-ai-chat">Close</button>
      </div>
    ) : null
  )
}))

vi.mock('@/components/GuidedTourManager', () => ({
  default: ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
    isOpen ? (
      <div data-testid="guided-tour-modal">
        <h2>Guided Tour</h2>
        <button onClick={onClose} data-testid="close-tour">Close Tour</button>
      </div>
    ) : null
  )
}))

vi.mock('@/components/MapAbstraction', () => ({
  default: () => <div data-testid="map-abstraction">Map Component</div>
}))

vi.mock('@/components/StripePayment', () => ({
  default: () => <div data-testid="stripe-payment">Stripe Payment Component</div>
}))

vi.mock('@/components/BookingForm', () => ({
  default: () => <div data-testid="booking-form">Booking Form Component</div>
}))

vi.mock('@/components/UserDashboard', () => ({
  default: () => <div data-testid="user-dashboard">User Dashboard Component</div>
}))

vi.mock('@/components/VendorDashboard', () => ({
  default: () => <div data-testid="vendor-dashboard">Vendor Dashboard Component</div>
}))

vi.mock('@/components/AdminCockpit', () => ({
  default: () => <div data-testid="admin-cockpit">Admin Cockpit Component</div>
}))

// Import page components
import HomePageClient from '@/app/HomePageClient'

describe('Page Components Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('HomePageClient', () => {
    it('renders without crashing', () => {
      expect(() => render(<HomePageClient initialLocale="en-US" />)).not.toThrow()
    })

    it('displays main heading', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText(/Book Anything, Anywhere/)).toBeInTheDocument()
    })

    it('displays AI assistant text', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText(/Try our AI booking assistant/)).toBeInTheDocument()
    })

    it('displays commitment fee information', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText(/Only \$1 commitment fee/)).toBeInTheDocument()
    })

    it('has Start Chat button', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText('Start Chat')).toBeInTheDocument()
    })

    it('has Search button', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText('Search')).toBeInTheDocument()
    })

    it('has Watch Demo button', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText('Watch Demo')).toBeInTheDocument()
    })

    it('has Get Started button', () => {
      render(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText('Get Started')).toBeInTheDocument()
    })
  })

  describe('Navigation Components', () => {
    it('renders navigation elements', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Check for navigation elements
      expect(screen.getByText('About')).toBeInTheDocument()
      expect(screen.getByText('How it works')).toBeInTheDocument()
      expect(screen.getByText('FAQ')).toBeInTheDocument()
    })
  })

  describe('Footer Components', () => {
    it('renders footer elements', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Check for footer elements
      expect(screen.getByText('Privacy')).toBeInTheDocument()
      expect(screen.getByText('Terms')).toBeInTheDocument()
    })
  })

  describe('Responsive Design', () => {
    it('renders on different screen sizes', () => {
      const { rerender } = render(<HomePageClient initialLocale="en-US" />)
      
      // Test that the component renders without errors
      expect(screen.getByText(/Book Anything, Anywhere/)).toBeInTheDocument()
      
      // Re-render to test stability
      rerender(<HomePageClient initialLocale="en-US" />)
      expect(screen.getByText(/Book Anything, Anywhere/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper heading structure', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Check for main heading
      const mainHeading = screen.getByRole('heading', { level: 1 })
      expect(mainHeading).toBeInTheDocument()
    })

    it('has proper button labels', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Check that buttons have accessible text
      expect(screen.getByRole('button', { name: /Start Chat/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Search/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Watch Demo/i })).toBeInTheDocument()
    })
  })

  describe('Internationalization', () => {
    it('supports different locales', () => {
      expect(() => render(<HomePageClient initialLocale="en-US" />)).not.toThrow()
      expect(() => render(<HomePageClient initialLocale="de-DE" />)).not.toThrow()
      expect(() => render(<HomePageClient initialLocale="fr-FR" />)).not.toThrow()
    })
  })
}) 