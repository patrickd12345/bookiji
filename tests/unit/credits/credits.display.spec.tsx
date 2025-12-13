import { vi } from 'vitest';

// Mock is already applied globally via setup.ts

import { render, screen, waitFor } from '@testing-library/react';
import CreditsDisplay from '../../../src/components/CreditsDisplay';

// Mock fetch
global.fetch = vi.fn();

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
    dedicated_manager: true 
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
    vi.clearAllMocks();
    (fetch as any).mockResolvedValue({
      json: () => Promise.resolve({ success: true, data: mockUserCredits }),
    });
  });

  it('renders loading state initially', () => {
    render(<CreditsDisplay {...defaultProps} />);
    // The loading state shows skeleton elements, not text
    expect(document.querySelector('.animate-pulse')).toBeInTheDocument();
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
      expect(screen.getByText('Dedicated Manager')).toBeInTheDocument();
      expect(screen.getByText('Referrals:')).toBeInTheDocument();
      expect(screen.getByText('8')).toBeInTheDocument();
    });
  });

  it('handles error state gracefully', async () => {
    (fetch as any).mockRejectedValue(new Error('Network error'));
    
    render(<CreditsDisplay {...defaultProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Error loading credits')).toBeInTheDocument();
    });
  });

  it('handles API error response', async () => {
    (fetch as any).mockResolvedValue({
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
      expect(container?.parentElement).toHaveClass('custom-class');
    });
  });

  it('displays tier icon and color correctly', async () => {
    render(<CreditsDisplay {...defaultProps} />);
    
    await waitFor(() => {
      const tierBadge = screen.getByText('Platinum');
      expect(tierBadge).toBeInTheDocument();
      // The tier should have the appropriate styling class
      expect(tierBadge).toBeInTheDocument();
      expect(tierBadge).toHaveClass('text-sm', 'font-medium', 'text-purple-500');
    });
  });
});
