import { vi } from 'vitest';

// Mock is already applied globally via setup.ts, override behavior if needed in beforeEach

import { CreditsService } from '../../../src/lib/credits';
import { CREDITS_CONSTANTS } from '@/types/credits';

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
      expect(creditsService.formatCredits(-25.75)).toBe('$-25.75');
    });
  });

  describe('getTierIcon', () => {
    it('returns correct icons for each tier', () => {
      expect(creditsService.getTierIcon('Bronze')).toBe('🥉');
      expect(creditsService.getTierIcon('Silver')).toBe('🥈');
      expect(creditsService.getTierIcon('Gold')).toBe('🥇');
      expect(creditsService.getTierIcon('Platinum')).toBe('💎');
      expect(creditsService.getTierIcon('Diamond')).toBe('⭐');
      expect(creditsService.getTierIcon('Unknown')).toBe('⭐');
    });
  });

  describe('getTierColor', () => {
    it('returns correct colors for each tier', () => {
      expect(creditsService.getTierColor('Bronze')).toBe('text-amber-600');
      expect(creditsService.getTierColor('Silver')).toBe('text-gray-400');
      expect(creditsService.getTierColor('Gold')).toBe('text-yellow-500');
      expect(creditsService.getTierColor('Platinum')).toBe('text-purple-500');
      expect(creditsService.getTierColor('Diamond')).toBe('text-gray-600');
      expect(creditsService.getTierColor('Unknown')).toBe('text-gray-600');
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
