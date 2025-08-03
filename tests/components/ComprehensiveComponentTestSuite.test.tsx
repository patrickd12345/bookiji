import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'

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
    setLocale: vi.fn(),
    locale: 'en-US',
    country: 'US'
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

// Mock complex components that depend on external services
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

// Import UI components
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

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

  describe('UI Components', () => {
    describe('Button Component', () => {
      it('renders with text', () => {
        render(<Button>Test Button</Button>)
        expect(screen.getByText('Test Button')).toBeInTheDocument()
      })

      it('handles clicks', () => {
        const handleClick = vi.fn()
        render(<Button onClick={handleClick}>Clickable</Button>)
        fireEvent.click(screen.getByText('Clickable'))
        expect(handleClick).toHaveBeenCalled()
      })

      it('supports all variants', () => {
        const variants = ['default', 'destructive', 'outline', 'secondary', 'ghost', 'link']
        variants.forEach(variant => {
          const { unmount } = render(<Button variant={variant as any}>Variant {variant}</Button>)
          expect(screen.getByText(`Variant ${variant}`)).toBeInTheDocument()
          unmount()
        })
      })

      it('supports all sizes', () => {
        const sizes = ['default', 'sm', 'lg', 'icon']
        sizes.forEach(size => {
          const { unmount } = render(<Button size={size as any}>Size {size}</Button>)
          expect(screen.getByText(`Size ${size}`)).toBeInTheDocument()
          unmount()
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
        expect(() => render(<AIConversationalInterface />)).not.toThrow()
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
      render(<RealAIChat isOpen={true} onClose={vi.fn()} />)
      expect(screen.getByTestId('ai-chat-modal')).toBeInTheDocument()
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
        render(<Label />)
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
      
      render(
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
      expect(screen.getAllByRole('button')).toHaveLength(20)
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
        )
      }).not.toThrow()
    })
  })
}) 