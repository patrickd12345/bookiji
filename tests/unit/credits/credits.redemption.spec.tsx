import { vi } from 'vitest';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  getSupabaseClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: null, error: null })),
        })),
      })),
    })),
    rpc: vi.fn(() => Promise.resolve({ data: null, error: null })),
  })),
}));

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CreditsRedemption } from '../../../src/components/CreditsRedemption';

// Mock fetch
global.fetch = vi.fn();

const mockUserCredits = {
  id: '1',
  email: 'test@example.com',
  credits_balance: 50.00,
  total_credits_earned: 100.00,
  total_credits_spent: 50.00,
  current_tier: 'Gold',
  tier_level: 2,
  bonus_multiplier: 1.5,
  discount_percentage: 10,
  benefits: { priority_support: true },
  total_referrals: 5,
  completed_referrals: 3,
};

const defaultProps = {
  userId: '1',
  totalCost: 100.00,
  onCreditsAppliedAction: jest.fn(),
  className: '',
};

describe('CreditsRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockUserCredits }),
    });
  });

  it('renders loading state initially', () => {
    render(<CreditsRedemption {...defaultProps} />);
    // The loading state shows skeleton elements, not text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
  });

  it('displays user credits and tier information', async () => {
    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('💎 Apply Credits')).toBeInTheDocument();
      // Check for the tier badge specifically by looking for the badge element
      const tierBadge = screen.getByText((content, element) => {
        return element?.className?.includes('inline-flex') && 
               element?.textContent?.includes('Gold') || false;
      });
      expect(tierBadge).toBeInTheDocument();
      expect(screen.getByText('$50.00')).toBeInTheDocument();
    });
  });

  it('allows user to input redemption amount', async () => {
    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      const input = screen.getByLabelText('Amount to Apply');
      fireEvent.change(input, { target: { value: '25.00' } });
      expect(input).toHaveValue(25);
    });
  });

  it('applies max redemption when max button is clicked', async () => {
    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      const maxButton = screen.getByText('Max');
      fireEvent.click(maxButton);
      
      // Max redemption should be 25% of total cost (25.00) or available balance (50.00), whichever is lower
      const input = screen.getByLabelText('Amount to Apply');
      expect(input).toHaveValue(25);
    });
  });

  it('shows cost breakdown when amount is entered', async () => {
    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      const input = screen.getByLabelText('Amount to Apply');
      fireEvent.change(input, { target: { value: '20.00' } });
      
      expect(screen.getByText('Original Cost:')).toBeInTheDocument();
      expect(screen.getByText('Credits Applied:')).toBeInTheDocument();
      expect(screen.getByText('Final Cost:')).toBeInTheDocument();
    });
  });

  it('calls onCreditsApplied when credits are successfully applied', async () => {
    (fetch as any)
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockUserCredits }),
      })
      .mockResolvedValueOnce({
        json: () => Promise.resolve({ success: true, data: mockUserCredits }),
      });

    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      const input = screen.getByLabelText('Amount to Apply');
      fireEvent.change(input, { target: { value: '20.00' } });
      
      const applyButton = screen.getByText(/Apply \$20.00 Credits/);
      fireEvent.click(applyButton);
    });

    await waitFor(() => {
      expect(defaultProps.onCreditsAppliedAction).toHaveBeenCalledWith(20, 82);
    });
  });
});
