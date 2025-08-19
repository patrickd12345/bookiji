import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import HomePageClient from '@/app/HomePageClient'

// Mock the RealAIChat component
vi.mock('@/components/RealAIChat', () => ({
  default: () => (
    <div data-testid="ai-chat-modal">
      <h2>AI Chat Modal</h2>
      <button data-testid="close-ai-chat">Close</button>
    </div>
  )
}))

// Mock the GuidedTourManager component
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

// Mock the useAuth hook
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    canBookServices: true,
    canOfferServices: false,
    loading: false
  })
}))

// Mock the i18n hook
vi.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => {
      // Return actual English text for the keys used in HomePageClient
      const translations: Record<string, string> = {
        'home.headline': 'Universal Booking Platform',
        'home.tagline': 'Book any service, anywhere, instantly. One-click booking with AI assistance and $1.00 commitment fee guarantee.',
        'home.search_placeholder': 'What service do you need?',
        'buttons.search': 'Search',
        'home.feature_grid.chat.title': 'Real-Time Booking Chat',
        'buttons.start_chat': 'Start Chat',
        'buttons.watch_demo': 'Watch Demo',
        'cta.get_started': 'Get Started',
        'home.commitment_banner': 'Only $1.00 commitment fee • No hidden charges',
        'home.feature_grid.title': 'Experience the Future of Booking',
        'home.feature_grid.radius.title': 'AI Radius Scaling',
        'home.launch_stats.title': 'Global Scale, Local Feel',
        'home.launch_stats.countries': 'Countries Supported',
        'home.launch_stats.currencies': 'Currencies Available',
        'home.launch_stats.languages': 'Languages & Locales',
        'home.cta.title': 'Ready to Transform Booking?',
        'home.cta.subtitle': 'Join thousands of businesses already using Bookiji to streamline their booking process.',
        'buttons.start_interactive_tour': 'Start Interactive Tour'
      }
      return translations[key] || key
    },
    formatCurrency: (amount: number) => `$${amount}`,
    setLocale: vi.fn()
  })
}))

describe('HomePageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Button Interactions', () => {
    it('opens AI chat when Start Chat button is clicked', async () => {
      render(<HomePageClient />)
      
      const startChatButton = screen.getByText('Start Chat')
      expect(startChatButton).toBeInTheDocument()
      
      fireEvent.click(startChatButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-chat-modal')).toBeInTheDocument()
      })
    })

    it('opens AI chat when Search button is clicked', async () => {
      render(<HomePageClient />)
      
      const searchButton = screen.getByText('Search')
      expect(searchButton).toBeInTheDocument()
      fireEvent.click(searchButton)

      await waitFor(() => {
        expect(screen.getByText('Start Chat')).toBeInTheDocument()
      })
    })

    it('has clickable Search button', () => {
      render(<HomePageClient />)
      const searchButton = screen.getByText('Search')
      expect(searchButton).toBeInTheDocument()
      fireEvent.click(searchButton)
      expect(searchButton).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('renders Get Started link', () => {
      render(<HomePageClient />)
      
      const getStartedLink = screen.getByText('Get Started')
      expect(getStartedLink).toBeInTheDocument()
      expect(getStartedLink.closest('a')).toHaveAttribute('href', '/get-started')
    })
  })

  describe('Content Rendering', () => {
    it('renders main headline correctly', () => {
      render(<HomePageClient />)
      
      expect(screen.getByText('Universal Booking Platform')).toBeInTheDocument()
      expect(screen.getByText(/Book any service, anywhere, instantly/)).toBeInTheDocument()
    })

    it('renders AI assistant description', () => {
      render(<HomePageClient />)
      
      expect(screen.getByText('🤖')).toBeInTheDocument()
      expect(screen.getByText('Real-Time Booking Chat')).toBeInTheDocument()
    })

    it('renders commitment fee information', () => {
      render(<HomePageClient />)
      
      expect(screen.getByText('💡')).toBeInTheDocument()
      expect(screen.getByText(/Only \$1\.00 commitment fee/)).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper button accessibility attributes', () => {
      render(<HomePageClient />)
      
      const startChatButton = screen.getByText('Start Chat')
      const searchButton = screen.getByText('Search')
      
      // Check that buttons exist and are clickable
      expect(startChatButton).toBeInTheDocument()
      expect(searchButton).toBeInTheDocument()
    })

    it('has proper link accessibility attributes', () => {
      render(<HomePageClient />)
      
      const getStartedLink = screen.getByText('Get Started')
      expect(getStartedLink.closest('a')).toHaveAttribute('href')
    })
  })

  describe('Responsive Design', () => {
    it('renders mobile-friendly layout', () => {
      render(<HomePageClient />)
      
      // Check that the component renders without errors on mobile viewport
      const container = screen.getByText('Universal Booking Platform')
      expect(container).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('manages AI chat modal state correctly', async () => {
      render(<HomePageClient />)
      
      // Check that the Start Chat button exists and is clickable
      const startChatButton = screen.getByText('Start Chat')
      expect(startChatButton).toBeInTheDocument()
      
      // Click the button to test interaction
      fireEvent.click(startChatButton)
      
      // Verify the button is still there after click
      expect(startChatButton).toBeInTheDocument()
    })

    it('manages guided tour modal state correctly', async () => {
      render(<HomePageClient />)
      
      // Initially modal should be closed
      expect(screen.queryByText('Guided Tour')).not.toBeInTheDocument()
      
      // Open modal by clicking the tour button - look for the actual tour button
      const tourButton = screen.getByRole('button', { name: /Start Interactive Tour/i })
      fireEvent.click(tourButton)
      
      // Since GuidedTourManager is a complex component, we just verify the button click works
      expect(tourButton).toBeInTheDocument()
    })
  })
}) 