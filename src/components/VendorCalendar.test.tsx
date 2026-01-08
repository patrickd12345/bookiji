import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import VendorCalendar from './VendorCalendar'

// Mock useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'test-user-id' } })
}))

// Mock useI18n
vi.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    formatDate: (date: Date) => 'Formatted Date',
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`
  })
}))

// Mock fetch
global.fetch = vi.fn()

describe('VendorCalendar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, bookings: [] })
    })
  })

  it('should fetch data only once on mount and not re-fetch on view change', async () => {
    render(<VendorCalendar />)

    // Initial fetch
    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith('/api/bookings/vendor')
    })

    // Clear mock to track subsequent calls
    ;(global.fetch as any).mockClear()

    // Find and click the 'Month' view button
    const monthButton = screen.getByText('Month')
    fireEvent.click(monthButton)

    // Verify fetch was NOT called again
    // We wait a tick to ensure useEffect would have fired
    await new Promise(resolve => setTimeout(resolve, 0))

    expect(fetch).not.toHaveBeenCalled()
  })
})
