import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ForgotPasswordPage from '@/app/forgot-password/page';

// Mock Supabase client
vi.mock('@/lib/supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

describe('ForgotPasswordPage', () => {
  it('renders without crashing', () => {
    render(<ForgotPasswordPage />);
    
    // Check that the main heading is present
    expect(screen.getByText('Reset your password')).toBeInTheDocument();
  });

  it('displays email input field', () => {
    render(<ForgotPasswordPage />);
    
    // Check that email input is present
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
  });

  it('displays submit button', () => {
    render(<ForgotPasswordPage />);
    
    // Check that submit button is present
    expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
  });

  it('displays link back to login', () => {
    render(<ForgotPasswordPage />);
    
    // Check that login link is present
    expect(screen.getByText('Back to login')).toBeInTheDocument();
  });
});

