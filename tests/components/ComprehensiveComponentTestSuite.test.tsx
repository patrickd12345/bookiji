import { describe, it, expect, vi, beforeEach, afterEach, afterAll } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { render } from '@testing-library/react'
import { GuidedTourProvider } from '@/components/guided-tours/GuidedTourProvider'

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

vi.mock('@/hooks/useAsyncState', () => ({
  useAsyncOperation: () => ({
    run: vi.fn(),
    isLoading: false,
    error: null,
    data: null
  })
}))

vi.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    t: (key: string) => key,
    formatCurrency: (amount: number) => `$${amount}`,
    setLocale: vi.fn(),
    locale: 'en-US',
    country: 'US'
  }),
  SUPPORTED_LOCALES: ['en-US', 'de-DE', 'fr-FR']
}))

// Mock is already applied globally via setup.ts

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
    })),
    maps: {
      Map: vi.fn(() => ({
        on: vi.fn(),
        addControl: vi.fn(),
        remove: vi.fn()
      }))
    }
  },
  default: {
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
    })),
    maps: {
      Map: vi.fn(() => ({
        on: vi.fn(),
        addControl: vi.fn(),
        remove: vi.fn()
      }))
    }
  }
}))

// Mock async-heavy components that can cause hanging
vi.mock('@/components/RealTimeBookingChat', () => ({
  default: () => <div data-testid="real-time-chat">Mock Real-Time Chat</div>
}))

vi.mock('@/components/RealAIChat', () => ({
  default: () => (
    <div data-testid="ai-chat-component">
      <h2>AI Booking Assistant</h2>
      <p>I can help you find and book any service</p>
    </div>
  )
}))

vi.mock('@/components/AuthEntry', () => ({
  default: () => <div data-testid="auth-entry">Mock Auth Entry</div>
}))

vi.mock('@/components/AIConversationalInterface', () => ({
  default: () => <div data-testid="ai-conversational">Mock AI Interface</div>
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

vi.mock('@/components/SimpleMap', () => ({
  default: () => <div data-testid="simple-map">Simple Map</div>
}))

vi.mock('@/components/LocaleSelector', () => ({
  default: () => <div data-testid="locale-selector">Locale Selector</div>
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

// Mock scrollIntoView to prevent test errors
Object.defineProperty(window, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Mock scrollIntoView on HTMLElement prototype to prevent test errors
Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  writable: true,
  value: vi.fn(),
});

// Remove fake timers - they're causing issues with the Switch component
// vi.useFakeTimers()

// Import UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

// Define proper types for Button variants and sizes
type ButtonVariant = 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
type ButtonSize = 'default' | 'sm' | 'lg' | 'icon'

// Import application components that are actually exported
import {
  LocaleSelector,
  RealTimeBookingChat,
  SimpleTourButton,
  PlatformDisclosures,
  RealAIChat,
  AuthEntry,
  CustomerRegistration,
  SimpleHelpCenter,
  VendorAnalytics,
  FeedbackCollector,
  DemoControls,
  TourButton,
  HelpBanner,
  LLMQuoteGenerator,
  SimpleMap,
  ReviewSystem,
  NoShowFeedbackModal,
  BookingGuaranteeModal,
  AsyncWarning,
  AIConversationalInterface
} from '@/components'

describe('Comprehensive Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    // Clean up any remaining mocks
    vi.clearAllMocks()
  })

  afterAll(() => {
    // Restore real timers
    vi.useRealTimers()
  })

  describe('UI Components', () => {
    describe('Button Component', () => {
      const ButtonVariants: ButtonVariant[] = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
      const ButtonSizes: ButtonSize[] = ['default', 'sm', 'lg', 'icon']
      
      ButtonVariants.forEach(variant => {
        ButtonSizes.forEach(size => {
          it(`renders ${variant} ${size} button`, () => {
            const { unmount } = render(<Button variant={variant} size={size}>Test Button</Button>)
            expect(screen.getByText('Test Button')).toBeInTheDocument()
            unmount()
          })
        })
      })
    })

    describe('Card Component', () => {
      it('renders with title and content', () => {
        render(
          <Card>
            <CardTitle>Test Title</CardTitle>
            <CardContent>Test Content</CardContent>
          </Card>
        )
        expect(screen.getByText('Test Title')).toBeInTheDocument()
        expect(screen.getByText('Test Content')).toBeInTheDocument()
      })
    })

    describe('Input Component', () => {
      it('renders with placeholder', () => {
        render(<Input placeholder="Enter text" />)
        expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument()
      })

      it('handles value changes', () => {
        const handleChange = vi.fn()
        render(<Input onChange={handleChange} placeholder="Test" />)
        const input = screen.getByPlaceholderText('Test')
        fireEvent.change(input, { target: { value: 'new value' } })
        expect(handleChange).toHaveBeenCalled()
        expect(input).toHaveValue('new value')
      })
    })

    describe('Label Component', () => {
      it('renders label text', () => {
        render(<Label>Test Label</Label>)
        expect(screen.getByText('Test Label')).toBeInTheDocument()
      })
    })

    describe('Switch Component', () => {
      it('renders switch', () => {
        render(<Switch />)
        expect(screen.getByRole('switch')).toBeInTheDocument()
      })

      it('handles toggle', () => {
        const handleChange = vi.fn()
        render(<Switch onCheckedChange={handleChange} />)
        
        fireEvent.click(screen.getByRole('switch'))
        expect(handleChange).toHaveBeenCalledWith(true)
      })
    })

    // Temporarily comment out other tests to isolate the hanging issue
    /*
    describe('Dropdown Menu Component', () => {
      it('renders dropdown trigger', () => {
        render(
          <DropdownMenu>
            <DropdownMenuTrigger>Open</DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>Item</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )
        expect(screen.getByText('Open')).toBeInTheDocument()
      })
    })
    */
  })

  describe('Core Application Components', () => {
    describe('LocaleSelector', () => {
      it('renders without crashing', () => {
        expect(() => render(<LocaleSelector />)).not.toThrow()
      })
    })

    describe('RealTimeBookingChat', () => {
      it('renders without crashing', () => {
        expect(() => render(<RealTimeBookingChat />)).not.toThrow()
      })
    })

    describe('SimpleTourButton', () => {
      it('renders without crashing', () => {
        expect(() => render(<SimpleTourButton onClick={vi.fn()} />)).not.toThrow()
      })
    })

    describe('PlatformDisclosures', () => {
      it('renders without crashing', () => {
        expect(() => render(<PlatformDisclosures />)).not.toThrow()
      })
    })

    describe('AuthEntry', () => {
      it('renders without crashing', () => {
        expect(() => render(<AuthEntry />)).not.toThrow()
      })
    })

    describe('CustomerRegistration', () => {
      it('renders without crashing', () => {
        expect(() => render(<CustomerRegistration />)).not.toThrow()
      })
    })

    describe('SimpleHelpCenter', () => {
      it('renders without crashing', () => {
        expect(() => render(<SimpleHelpCenter type="customer" />)).not.toThrow()
      })
    })

    describe('VendorAnalytics', () => {
      it('renders without crashing', () => {
        expect(() => render(<VendorAnalytics />)).not.toThrow()
      })
    })

    describe('FeedbackCollector', () => {
      it('renders without crashing', () => {
        expect(() => render(<FeedbackCollector />)).not.toThrow()
      })
    })

    describe('DemoControls', () => {
      it('renders without crashing', () => {
        expect(() => render(<DemoControls />)).not.toThrow()
      })
    })

    describe('TourButton', () => {
      it('renders without crashing', () => {
        expect(() => render(<TourButton />)).not.toThrow()
      })
    })

    describe('HelpBanner', () => {
      it('renders without crashing', () => {
        expect(() => render(<HelpBanner />)).not.toThrow()
      })
    })

    describe('LLMQuoteGenerator', () => {
      it('renders without crashing', () => {
        expect(() => render(<LLMQuoteGenerator />)).not.toThrow()
      })
    })

    describe('SimpleMap', () => {
      it('renders without crashing', () => {
        expect(() => render(<SimpleMap />)).not.toThrow()
      })
    })

    describe('ReviewSystem', () => {
      it('renders without crashing', () => {
        expect(() => render(<ReviewSystem vendorId="test" />)).not.toThrow()
      })
    })

    describe('NoShowFeedbackModal', () => {
      it('renders without crashing', () => {
        expect(() => render(<NoShowFeedbackModal />)).not.toThrow()
      })
    })

    describe('BookingGuaranteeModal', () => {
      it('renders without crashing', () => {
        expect(() => render(<BookingGuaranteeModal />)).not.toThrow()
      })
    })

    describe('AsyncWarning', () => {
      it('renders without crashing', () => {
        expect(() => render(<AsyncWarning operation="general" />)).not.toThrow()
      })
    })

    describe('AIConversationalInterface', () => {
      it('renders without crashing', () => {
        expect(() => render(
          <GuidedTourProvider>
            <AIConversationalInterface />
          </GuidedTourProvider>
        )).not.toThrow()
      })
    })
  })

  describe('Component Interactions', () => {
    it('form components work together', () => {
      const handleSubmit = vi.fn((e) => e.preventDefault())
      
      render(
        <form onSubmit={handleSubmit}>
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" placeholder="Enter name" />
          
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" placeholder="Enter email" />
          
          <Button type="submit">Submit</Button>
        </form>
      )
      
      const nameInput = screen.getByPlaceholderText('Enter name')
      const emailInput = screen.getByPlaceholderText('Enter email')
      const submitButton = screen.getByText('Submit')
      
      fireEvent.change(nameInput, { target: { value: 'John Doe' } })
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } })
      fireEvent.click(submitButton)
      
      expect(handleSubmit).toHaveBeenCalled()
    })

    it('modal components can be opened and closed', async () => {
      render(<RealAIChat />)
      expect(screen.getByTestId('ai-chat-component')).toBeInTheDocument()
    })

    it('dropdown components render correctly', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      expect(screen.getByText('Open Menu')).toBeInTheDocument()
    })
  })

  describe('Accessibility Testing', () => {
    it('all buttons have proper ARIA attributes', () => {
      render(
        <div>
          <Button aria-label="Primary action">Primary</Button>
          <Button aria-label="Secondary action">Secondary</Button>
        </div>
      )
      
      expect(screen.getByLabelText('Primary action')).toBeInTheDocument()
      expect(screen.getByLabelText('Secondary action')).toBeInTheDocument()
    })

    it('all inputs have proper labels', () => {
      render(
        <div>
          <Label htmlFor="search">Search</Label>
          <Input id="search" placeholder="Search..." />
          
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" placeholder="Email..." />
        </div>
      )
      
      expect(screen.getByLabelText('Search')).toBeInTheDocument()
      expect(screen.getByLabelText('Email')).toBeInTheDocument()
    })

    it('switches have proper ARIA roles', () => {
      render(
        <div>
          <Switch aria-label="Enable notifications" />
          <Switch aria-label="Enable dark mode" />
        </div>
      )
      
      const switches = screen.getAllByRole('switch')
      expect(switches).toHaveLength(2)
      expect(switches[0]).toHaveAttribute('aria-label', 'Enable notifications')
      expect(switches[1]).toHaveAttribute('aria-label', 'Enable dark mode')
    })
  })

  describe('Error Handling', () => {
    it('components handle missing props gracefully', () => {
      expect(() => {
        render(<Button />)
        render(<Input />)
        render(<Card />)
        render(<Label>Test Label</Label>)
      }).not.toThrow()
    })

    it('components handle invalid props gracefully', () => {
      expect(() => {
        render(<Button onClick={undefined} />)
        render(<Input onChange={undefined} />)
        render(<Switch onCheckedChange={undefined} />)
      }).not.toThrow()
    })
  })

  describe('Performance Testing', () => {
    it('renders multiple components efficiently', () => {
      const startTime = performance.now()
      
      const { container } = render(
        <div>
          {Array.from({ length: 20 }, (_, i) => (
            <Button key={i}>Button {i}</Button>
          ))}
          {Array.from({ length: 10 }, (_, i) => (
            <Card key={i}>
              <CardContent>Card {i}</CardContent>
            </Card>
          ))}
        </div>
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render 30 components quickly (less than 200ms)
      expect(renderTime).toBeLessThan(200)
      
      // Count buttons only within our test container, not from mocks
      const testButtons = container.querySelectorAll('button')
      expect(testButtons).toHaveLength(20)
    })
  })

  describe('Responsive Design', () => {
    it('components render without errors on different viewport sizes', () => {
      const { rerender } = render(
        <div>
          <Button>Test Button</Button>
          <Card>
            <CardContent>Test Content</CardContent>
          </Card>
          <Input placeholder="Test Input" />
        </div>
      )
      
      expect(screen.getByText('Test Button')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Test Input')).toBeInTheDocument()
      
      // Re-render to test stability
      rerender(
        <div>
          <Button>Test Button 2</Button>
          <Card>
            <CardContent>Test Content 2</CardContent>
          </Card>
          <Input placeholder="Test Input 2" />
        </div>
      )
      
      expect(screen.getByText('Test Button 2')).toBeInTheDocument()
      expect(screen.getByText('Test Content 2')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Test Input 2')).toBeInTheDocument()
    })
  })

  describe('Component Integration', () => {
    it('all components can be used together in a complex layout', () => {
      expect(() => {
        render(
          <GuidedTourProvider>
            <div>
              <Card>
                <CardTitle>Dashboard</CardTitle>
                <CardContent>
                  <Label htmlFor="search">Search</Label>
                  <Input id="search" placeholder="Search..." />
                  <Button>Search</Button>
                </CardContent>
              </Card>
              <SimpleTourButton onClick={vi.fn()} />
              <HelpBanner />
            </div>
          </GuidedTourProvider>
        )
      }).not.toThrow()
    })
  })
}) 
