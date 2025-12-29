import { vi } from 'vitest';
import { CreditsService } from './credits';
import { CREDITS_CONSTANTS } from '@/types/credits';

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

describe('CreditsService', () => {
  let creditsService: CreditsService;

  beforeEach(() => {
    creditsService = CreditsService.getInstance();
  });

  describe('getInstance', () => {
    it('returns the same instance', () => {
      const instance1 = CreditsService.getInstance();
      const instance2 = CreditsService.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('formatCredits', () => {
    it('formats whole numbers correctly', () => {
      expect(creditsService.formatCredits(100)).toBe('$100.00');
      expect(creditsService.formatCredits(0)).toBe('$0.00');
    });

    it('formats decimal numbers correctly', () => {
      expect(creditsService.formatCredits(99.99)).toBe('$99.99');
      expect(creditsService.formatCredits(50.5)).toBe('$50.50');
    });

    it('handles negative numbers', () => {
      expect(creditsService.formatCredits(-25.75)).toBe('-$25.75');
    });
  });

  describe('getTierIcon', () => {
    it('returns correct icons for each tier', () => {
      expect(creditsService.getTierIcon('Bronze')).toBe('🥉');
      expect(creditsService.getTierIcon('Silver')).toBe('🥈');
      expect(creditsService.getTierIcon('Gold')).toBe('🥇');
      expect(creditsService.getTierIcon('Platinum')).toBe('💎');
      expect(creditsService.getTierIcon('Diamond')).toBe('💠');
      expect(creditsService.getTierIcon('Unknown')).toBe('⭐');
    });
  });

  describe('getTierColor', () => {
    it('returns correct colors for each tier', () => {
      expect(creditsService.getTierColor('Bronze')).toBe('bg-amber-100 text-amber-800 border-amber-200');
      expect(creditsService.getTierColor('Silver')).toBe('bg-gray-100 text-gray-800 border-gray-200');
      expect(creditsService.getTierColor('Gold')).toBe('bg-yellow-100 text-yellow-800 border-yellow-200');
      expect(creditsService.getTierColor('Platinum')).toBe('bg-blue-100 text-blue-800 border-blue-200');
      expect(creditsService.getTierColor('Diamond')).toBe('bg-purple-100 text-purple-800 border-purple-200');
      expect(creditsService.getTierColor('Unknown')).toBe('bg-gray-100 text-gray-800 border-gray-200');
    });
  });

  describe('validateRedemption', () => {
    it('validates minimum redemption amount', () => {
      const result = creditsService.validateRedemption(4.99, 100);
      expect(result).toBe(false);
    });

    it('validates sufficient balance', () => {
      const result = creditsService.validateRedemption(60, 50);
      expect(result).toBe(false);
    });

    it('accepts valid redemption amounts', () => {
      const result = creditsService.validateRedemption(20, 100);
      expect(result).toBe(true);
    });

    it('accepts exact minimum amount', () => {
      const result = creditsService.validateRedemption(5.00, 100);
      expect(result).toBe(true);
    });
  });



  describe('constants', () => {
    it('has correct constant values', () => {
      expect(CREDITS_CONSTANTS.MIN_REDEMPTION_AMOUNT).toBe(5.00);
      expect(CREDITS_CONSTANTS.MAX_REDEMPTION_PERCENTAGE).toBe(25);
      expect(CREDITS_CONSTANTS.DEFAULT_REFERRAL_BONUS).toBe(10.00);
      expect(CREDITS_CONSTANTS.DEFAULT_WELCOME_BONUS).toBe(5.00);
      expect(CREDITS_CONSTANTS.BOOKING_CREDITS_PERCENTAGE).toBe(5);
      expect(CREDITS_CONSTANTS.MAX_BOOKING_CREDITS).toBe(50.00);
    });
  });
});
