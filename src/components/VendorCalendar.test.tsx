import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import VendorCalendar from './VendorCalendar';

// Mock the relative import for useAuth
vi.mock('../../hooks/useAuth', () => ({
  useAuth: () => ({
    user: { id: 'test-vendor-id' },
    session: {},
    loading: false,
  }),
}));

// Mock framer-motion to avoid animation issues
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
}));

// Mock useI18n
vi.mock('@/lib/i18n/useI18n', () => ({
  useI18n: () => ({
    formatDate: (date: Date) => date.toLocaleDateString(),
    formatCurrency: (amount: number) => `$${amount.toFixed(2)}`,
  }),
}));

describe('VendorCalendar Performance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true, bookings: [] }),
      })
    ) as any;
  });

  it('fetches data on mount (Optimized)', async () => {
    await act(async () => {
      render(<VendorCalendar />);
    });

    // Optimization check: Should fetch ONLY bookings, NO schedule
    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith('/api/bookings/vendor');
  });

  it('DOES NOT fetch data again when changing date (Optimized)', async () => {
    await act(async () => {
      render(<VendorCalendar />);
    });

    // Clear initial calls
    vi.clearAllMocks();

    const nextWeekButton = screen.getByText('→');
    await act(async () => {
      fireEvent.click(nextWeekButton);
    });

    // Optimization check: No re-fetch on date change
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
