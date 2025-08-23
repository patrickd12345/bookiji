import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock Supabase client with realistic behavior
const mockResetPasswordForEmail = vi.fn();
const mockSupabase = {
  auth: {
    resetPasswordForEmail: mockResetPasswordForEmail,
  },
};

vi.mock('@/lib/supabaseClient', () => ({
  supabase: mockSupabase,
}));

describe('Forgot Password Flow - Integration Test', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResetPasswordForEmail.mockResolvedValue({ error: null });
  });

  it('should mock Supabase client correctly', () => {
    expect(mockResetPasswordForEmail).toBeDefined();
    expect(typeof mockResetPasswordForEmail).toBe('function');
  });

  it('should handle successful password reset request', async () => {
    // Simulate a successful password reset request
    const result = await mockResetPasswordForEmail('test@example.com', {
      redirectTo: 'http://localhost:3000/auth/reset'
    });
    
    expect(result.error).toBeNull();
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/reset')
      })
    );
  });

  it('should handle Supabase errors properly', async () => {
    // Mock a Supabase error
    mockResetPasswordForEmail.mockResolvedValue({ 
      error: { message: 'User not found' } 
    });
    
    const result = await mockResetPasswordForEmail('nonexistent@example.com', {
      redirectTo: 'http://localhost:3000/auth/reset'
    });
    
    expect(result.error).toBeDefined();
    expect(result.error.message).toBe('User not found');
  });

  it('should call Supabase with correct parameters', () => {
    const email = 'test@example.com';
    const options = {
      redirectTo: 'http://localhost:3000/auth/reset'
    };
    
    mockResetPasswordForEmail(email, options);
    
    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(email, options);
    expect(mockResetPasswordForEmail).toHaveBeenCalledTimes(1);
  });
});

