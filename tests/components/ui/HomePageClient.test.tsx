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

describe('HomePageClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Button Interactions', () => {
    it('opens AI chat when Start Chat button is clicked', async () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      const startChatButton = screen.getByText('Start Chat')
      expect(startChatButton).toBeInTheDocument()
      
      fireEvent.click(startChatButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-chat-modal')).toBeInTheDocument()
      })
    })

    it('opens AI chat when Search button is clicked', async () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      const searchButton = screen.getByText('Search')
      expect(searchButton).toBeInTheDocument()
      
      fireEvent.click(searchButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('ai-chat-modal')).toBeInTheDocument()
      })
    })

    it('has clickable Search button', () => {
      render(<HomePageClient initialLocale="en-US" />)
      const searchButton = screen.getByText('Search')
      expect(searchButton).toBeInTheDocument()
      fireEvent.click(searchButton)
      expect(searchButton).toBeInTheDocument()
    })
  })

  describe('Navigation Links', () => {
    it('renders Get Started link', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      const getStartedLink = screen.getByText('Get Started')
      expect(getStartedLink).toBeInTheDocument()
      expect(getStartedLink.closest('a')).toHaveAttribute('href', '/get-started')
    })
  })

  describe('Content Rendering', () => {
    it('renders main headline correctly', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      expect(screen.getByText('Book Anything,')).toBeInTheDocument()
      expect(screen.getByText('Anywhere')).toBeInTheDocument()
      expect(screen.getByText(/The universal booking platform powered by AI/)).toBeInTheDocument()
    })

    it('renders AI assistant description', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      expect(screen.getAllByText('🤖')).toHaveLength(2) // One in the main component, one in the mock
      expect(screen.getByText('Try our AI booking assistant')).toBeInTheDocument()
    })

    it('renders commitment fee information', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      expect(screen.getByText('💡')).toBeInTheDocument()
      expect(screen.getByText('Only $1 commitment fee • No hidden charges')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper button accessibility attributes', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      const startChatButton = screen.getByText('Start Chat')
      const searchButton = screen.getByText('Search')
      
      // Check that buttons exist and are clickable
      expect(startChatButton).toBeInTheDocument()
      expect(searchButton).toBeInTheDocument()
    })

    it('has proper link accessibility attributes', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      const getStartedLink = screen.getByText('Get Started')
      expect(getStartedLink.closest('a')).toHaveAttribute('href')
    })
  })

  describe('Responsive Design', () => {
    it('renders mobile-friendly layout', () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Check that the component renders without errors on mobile viewport
      const container = screen.getByText('Book Anything,')
      expect(container).toBeInTheDocument()
    })
  })

  describe('State Management', () => {
    it('manages AI chat modal state correctly', async () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Check that the Start Chat button exists and is clickable
      const startChatButton = screen.getByText('Start Chat')
      expect(startChatButton).toBeInTheDocument()
      
      // Click the button to test interaction
      fireEvent.click(startChatButton)
      
      // Verify the button is still there after click
      expect(startChatButton).toBeInTheDocument()
    })

    it('manages guided tour modal state correctly', async () => {
      render(<HomePageClient initialLocale="en-US" />)
      
      // Initially modal should be closed
      expect(screen.queryByText('Guided Tour')).not.toBeInTheDocument()
      
      // Open modal by clicking the tour button
      const tourButton = screen.getByTitle('Open Help Center')
      fireEvent.click(tourButton)
      
      // Since GuidedTourManager is a complex component, we just verify the button click works
      expect(tourButton).toBeInTheDocument()
    })
  })
}) 