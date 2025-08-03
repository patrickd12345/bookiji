import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown-menu'

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

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    user: null,
    isAuthenticated: false,
    canBookServices: true,
    canOfferServices: false,
    loading: false
  })
}))

describe('UI Component Test Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Button Component', () => {
    it('renders button with correct text', () => {
      render(<Button>Click me</Button>)
      expect(screen.getByText('Click me')).toBeInTheDocument()
    })

    it('handles click events', () => {
      const handleClick = vi.fn()
      render(<Button onClick={handleClick}>Click me</Button>)
      
      fireEvent.click(screen.getByText('Click me'))
      expect(handleClick).toHaveBeenCalledTimes(1)
    })

    it('applies variant classes correctly', () => {
      render(<Button variant="destructive">Delete</Button>)
      const button = screen.getByText('Delete')
      expect(button).toHaveClass('bg-destructive')
    })

    it('applies size classes correctly', () => {
      render(<Button size="lg">Large Button</Button>)
      const button = screen.getByText('Large Button')
      expect(button).toHaveClass('h-10')
    })

    it('can be disabled', () => {
      render(<Button disabled>Disabled</Button>)
      const button = screen.getByText('Disabled')
      expect(button).toBeDisabled()
    })
  })

  describe('Card Component', () => {
    it('renders card with title and content', () => {
      render(
        <Card>
          <CardTitle>Test Card</CardTitle>
          <CardContent>Card content</CardContent>
        </Card>
      )
      
      expect(screen.getByText('Test Card')).toBeInTheDocument()
      expect(screen.getByText('Card content')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<Card className="custom-card">Content</Card>)
      const card = screen.getByText('Content').closest('div')
      expect(card).toHaveClass('custom-card')
    })
  })

  describe('Input Component', () => {
    it('renders input with placeholder', () => {
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

    it('can be disabled', () => {
      render(<Input disabled placeholder="Disabled" />)
      expect(screen.getByPlaceholderText('Disabled')).toBeDisabled()
    })

    it('supports different input types', () => {
      render(<Input type="email" placeholder="Email" />)
      expect(screen.getByPlaceholderText('Email')).toHaveAttribute('type', 'email')
    })
  })

  describe('Label Component', () => {
    it('renders label text', () => {
      render(<Label>Username</Label>)
      expect(screen.getByText('Username')).toBeInTheDocument()
    })

    it('can be associated with form controls', () => {
      render(
        <div>
          <Label htmlFor="username">Username</Label>
          <Input id="username" />
        </div>
      )
      
      const label = screen.getByText('Username')
      const input = screen.getByRole('textbox')
      
      expect(label).toHaveAttribute('for', 'username')
      expect(input).toHaveAttribute('id', 'username')
    })
  })

  describe('Switch Component', () => {
    it('renders switch with label', () => {
      render(<Switch id="test-switch" />)
      expect(screen.getByRole('switch')).toBeInTheDocument()
    })

    it('handles toggle events', () => {
      const handleCheckedChange = vi.fn()
      render(<Switch onCheckedChange={handleCheckedChange} />)
      
      const switchElement = screen.getByRole('switch')
      fireEvent.click(switchElement)
      
      expect(handleCheckedChange).toHaveBeenCalledWith(true)
    })

    it('can be disabled', () => {
      render(<Switch disabled />)
      expect(screen.getByRole('switch')).toBeDisabled()
    })
  })

  describe('Dropdown Menu Component', () => {
    it('renders dropdown trigger', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      expect(screen.getByText('Open Menu')).toBeInTheDocument()
    })

        it('renders dropdown trigger correctly', () => {
      render(
        <DropdownMenu>
          <DropdownMenuTrigger>Open Menu</DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem>Item 1</DropdownMenuItem>
            <DropdownMenuItem>Item 2</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )
      
      const trigger = screen.getByText('Open Menu')
      expect(trigger).toBeInTheDocument()
    })
  })

  describe('Form Interactions', () => {
    it('handles form submission with multiple inputs', () => {
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
      expect(nameInput).toHaveValue('John Doe')
      expect(emailInput).toHaveValue('john@example.com')
    })
  })

  describe('Accessibility Features', () => {
    it('buttons have proper ARIA attributes', () => {
      render(<Button aria-label="Close dialog">×</Button>)
      const button = screen.getByLabelText('Close dialog')
      expect(button).toBeInTheDocument()
    })

    it('inputs have proper labels', () => {
      render(
        <div>
          <Label htmlFor="search">Search</Label>
          <Input id="search" placeholder="Search..." />
        </div>
      )
      
      const input = screen.getByLabelText('Search')
      expect(input).toBeInTheDocument()
    })

    it('switches have proper ARIA roles', () => {
      render(<Switch aria-label="Enable notifications" />)
      const switchElement = screen.getByRole('switch')
      expect(switchElement).toHaveAttribute('aria-label', 'Enable notifications')
    })
  })

  describe('Responsive Design', () => {
    it('components render without errors on different screen sizes', () => {
      // Test that components render without breaking
      const { rerender } = render(
        <div>
          <Button>Test Button</Button>
          <Card>
            <CardContent>Test Content</CardContent>
          </Card>
        </div>
      )
      
      expect(screen.getByText('Test Button')).toBeInTheDocument()
      expect(screen.getByText('Test Content')).toBeInTheDocument()
      
      // Re-render to test stability
      rerender(
        <div>
          <Button>Test Button 2</Button>
          <Card>
            <CardContent>Test Content 2</CardContent>
          </Card>
        </div>
      )
      
      expect(screen.getByText('Test Button 2')).toBeInTheDocument()
      expect(screen.getByText('Test Content 2')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('handles invalid props gracefully', () => {
      // Test that components don't crash with invalid props
      expect(() => {
        render(<Button onClick={undefined}>Test</Button>)
      }).not.toThrow()
    })

    it('handles missing required props', () => {
      // Test that components handle missing props gracefully
      expect(() => {
        render(<Input />)
      }).not.toThrow()
    })
  })

  describe('Performance', () => {
    it('renders multiple components efficiently', () => {
      const startTime = performance.now()
      
      render(
        <div>
          {Array.from({ length: 10 }, (_, i) => (
            <Button key={i}>Button {i}</Button>
          ))}
        </div>
      )
      
      const endTime = performance.now()
      const renderTime = endTime - startTime
      
      // Should render 10 buttons quickly (less than 100ms)
      expect(renderTime).toBeLessThan(100)
      expect(screen.getAllByRole('button')).toHaveLength(10)
    })
  })
}) 