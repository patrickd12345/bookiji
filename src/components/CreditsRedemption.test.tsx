import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { CreditsRedemption } from './CreditsRedemption';

const fetchMock = vi.fn();

const mockCreditsData = {
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
  onCreditsAppliedAction: vi.fn(),
  className: '',
};

describe('CreditsRedemption', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('renders without crashing', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockCreditsData })
    });

    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Credits Available: 50.00')).toBeInTheDocument();
    });
  });

  it('shows loading state initially', () => {
    render(<CreditsRedemption {...defaultProps} />);
    expect(screen.getByText('Loading credits...')).toBeInTheDocument();
  });

  it('handles error state', async () => {
    fetchMock.mockRejectedValueOnce(new Error('Network error'));

    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading credits')).toBeInTheDocument();
    });
  });

  it('calculates max redemption correctly', async () => {
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, data: mockCreditsData })
    });

    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Credits Available: 50.00')).toBeInTheDocument();
    });

    const maxButton = screen.getByText('Use Max');
    fireEvent.click(maxButton);

    // Max should be 25% of total cost (25) or credits balance (50), whichever is lower
    expect(screen.getByDisplayValue('25.00')).toBeInTheDocument();
  });

  it('applies credits successfully', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: mockCreditsData })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true })
      });

    render(<CreditsRedemption {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Credits Available: 50.00')).toBeInTheDocument();
    });

    const input = screen.getByDisplayValue('0.00');
    fireEvent.change(input, { target: { value: '20' } });

    const applyButton = screen.getByText('Apply Credits');
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(defaultProps.onCreditsAppliedAction).toHaveBeenCalledWith(20, 82);
    });
  });
});



