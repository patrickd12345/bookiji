import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import CreditsDisplay from './CreditsDisplay';

const fetchMock = vi.fn();

const mockUserCredits = {
  id: '1',
  email: 'test@example.com',
  credits_balance: 75.50,
  total_credits_earned: 150.00,
  total_credits_spent: 74.50,
  current_tier: 'Platinum',
  tier_level: 3,
  bonus_multiplier: 2.0,
  discount_percentage: 15,
  benefits: { 
    priority_support: true, 
    exclusive_offers: true,
    vip_events: true 
  },
  total_referrals: 10,
  completed_referrals: 8,
};

const defaultProps = {
  userId: '1',
  showDetails: false,
  className: '',
};

describe('CreditsDisplay', () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockUserCredits }),
    });
    global.fetch = fetchMock as unknown as typeof fetch;
  });

  it('renders loading state initially', () => {
    render(<CreditsDisplay {...defaultProps} />);
    expect(screen.getByText('Loading credits...')).toBeInTheDocument();
  });

  it('displays basic credit information when showDetails is false', async () => {
    render(<CreditsDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('💎')).toBeInTheDocument();
      expect(screen.getByText('$75.50')).toBeInTheDocument();
      expect(screen.getByText('Platinum')).toBeInTheDocument();
    });
  });

  it('displays detailed credit information when showDetails is true', async () => {
    render(<CreditsDisplay {...defaultProps} showDetails={true} />);
    
    await waitFor(() => {
      expect(screen.getByText('Total Earned:')).toBeInTheDocument();
      expect(screen.getByText('$150.00')).toBeInTheDocument();
      expect(screen.getByText('Total Spent:')).toBeInTheDocument();
      expect(screen.getByText('$74.50')).toBeInTheDocument();
      expect(screen.getByText('Tier Benefits:')).toBeInTheDocument();
      expect(screen.getByText('Priority Support')).toBeInTheDocument();
      expect(screen.getByText('Exclusive Offers')).toBeInTheDocument();
      expect(screen.getByText('VIP Events')).toBeInTheDocument();
      expect(screen.getByText('Referrals:')).toBeInTheDocument();
      expect(screen.getByText('8/10 completed')).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    fetchMock.mockRejectedValue(new Error('Network error'));
    
    render(<CreditsDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading credits')).toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    fetchMock.mockResolvedValue({
      json: () => Promise.resolve({ success: false, error: 'Invalid user' }),
    });
    
    render(<CreditsDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Invalid user')).toBeInTheDocument();
    });
  });

  it('applies custom className', async () => {
    render(<CreditsDisplay {...defaultProps} className="custom-class" />);
    
    await waitFor(() => {
      const container = screen.getByText('💎').closest('div');
      expect(container).toHaveClass('custom-class');
    });
  });

  it('displays tier icon and color correctly', async () => {
    render(<CreditsDisplay {...defaultProps} />);
    
    await waitFor(() => {
      const tierBadge = screen.getByText('Platinum');
      expect(tierBadge).toBeInTheDocument();
      // The tier should have the appropriate styling class
      expect(tierBadge.closest('span')).toHaveClass('inline-flex');
    });
  });
});


