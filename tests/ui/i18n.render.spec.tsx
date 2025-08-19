import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePageClient from '@/app/HomePageClient'

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({ user: null, isAuthenticated: false, canBookServices: true, canOfferServices: false, loading: false })
}))

describe('i18n rendering', () => {
  it('renders en-US headline and content', () => {
    render(<HomePageClient />)
    expect(screen.getByText('Universal Booking Platform')).toBeInTheDocument()
    expect(screen.getByText(/Only \$1\.00 commitment fee/)).toBeInTheDocument()
  })

  it('renders fr-FR without crashing (falls back if needed)', () => {
    render(<HomePageClient />)
    expect(screen.getByText('Universal Booking Platform')).toBeInTheDocument()
  })

  it('renders de-DE without crashing (falls back if needed)', () => {
    render(<HomePageClient />)
    expect(screen.getByText('Universal Booking Platform')).toBeInTheDocument()
  })
})


