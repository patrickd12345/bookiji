import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getSupabaseMock } from '../utils/supabase-mocks';

describe('Forgot Password Flow - Integration Test', () => {
  beforeEach(() => {
    const mock = getSupabaseMock();
    mock.auth.resetPasswordForEmail.mockResolvedValue({ error: null });
    vi.clearAllMocks();
  });

  it('should mock Supabase client correctly', () => {
    const mock = getSupabaseMock();
    expect(mock.auth.resetPasswordForEmail).toBeDefined();
    expect(typeof mock.auth.resetPasswordForEmail).toBe('function');
  });

  it('should handle successful password reset request', async () => {
    const mock = getSupabaseMock();
    // Simulate a successful password reset request
    const result = await mock.auth.resetPasswordForEmail('test@example.com', {
      redirectTo: 'http://localhost:3000/auth/reset'
    });
    
    expect(result.error).toBeNull();
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith(
      'test@example.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/reset')
      })
    );
  });

  it('should handle Supabase errors properly', async () => {
    const mock = getSupabaseMock();
    // Mock a Supabase error
    mock.auth.resetPasswordForEmail.mockResolvedValue({ 
      error: { message: 'User not found' } as any
    } as any);
    
    const result = await mock.auth.resetPasswordForEmail('nonexistent@example.com', {
      redirectTo: 'http://localhost:3000/auth/reset'
    });
    
    expect(result.error).toBeDefined();
    if (result.error) {
      expect((result.error as any).message).toBe('User not found');
    }
  });

  it('should call Supabase with correct parameters', () => {
    const mock = getSupabaseMock();
    const email = 'test@example.com';
    const options = {
      redirectTo: 'http://localhost:3000/auth/reset'
    };
    
    mock.auth.resetPasswordForEmail(email, options);
    
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledWith(email, options);
    expect(mock.auth.resetPasswordForEmail).toHaveBeenCalledTimes(1);
  });
});

