// Credits Service Library
// Core business logic for the loyalty and credits system

import { getServerSupabase } from '@/lib/supabaseServer';

const getSupabaseClient = () => getServerSupabase()
import {
  CreditsTransaction,
  CreditsEarningRule,
  CreditsRedemptionRule,
  CreditsTier,
  CreditsReferral,
  UserCreditsSummary,
  CreditsEarningConfig,
  CreditsRedemptionConfig,
  CreditsCalculator,
  CREDITS_CONSTANTS,
} from '@/types/credits';

const supabase = getSupabaseClient();

export class CreditsService implements CreditsCalculator {
  private static instance: CreditsService;

  private constructor() {}

  public static getInstance(): CreditsService {
    if (!CreditsService.instance) {
      CreditsService.instance = new CreditsService();
    }
    return CreditsService.instance;
  }

  // Core calculation methods
  public async calculateEarningAmount(baseAmount: number, userTier: string): Promise<number> {
    const tier = await this.getTierByName(userTier);
    if (!tier) return baseAmount;

    const basePercentage = 5; // Default 5% earning
    let earningAmount = (baseAmount * basePercentage) / 100;

    // Apply tier bonus multiplier
    earningAmount *= tier.bonus_multiplier;

    // Apply max credits limit
    const maxCredits = 50.00;
    return Math.min(earningAmount, maxCredits);
  }

  public async calculateRedemptionDiscount(amount: number, userTier: string): Promise<number> {
    const tier = await this.getTierByName(userTier);
    if (!tier) return 0;

    return (amount * tier.discount_percentage) / 100;
  }

  public calculateTierUpgrade(creditsEarned: number): string {
    if (creditsEarned >= 2000) return 'Platinum';
    if (creditsEarned >= 500) return 'Gold';
    if (creditsEarned >= 100) return 'Silver';
    return 'Bronze';
  }

  public validateRedemption(amount: number, userBalance: number): boolean {
    return amount >= CREDITS_CONSTANTS.MIN_REDEMPTION_AMOUNT && amount <= userBalance;
  }

  // Database operations
  public async getUserCredits(userId: string): Promise<UserCreditsSummary | null> {
    try {
      const { data, error } = await supabase
        .from('user_credits_summary')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user credits:', error);
      return null;
    }
  }

  public async addCredits(
    userId: string,
    amount: number,
    transactionType: 'earn' | 'refund' | 'admin_adjustment',
    description: string,
    referenceType?: string,
    referenceId?: string,
    metadata?: Record<string, any>
  ): Promise<number | null> {
    try {
      const { data, error } = await supabase.rpc('add_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_transaction_type: transactionType,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_metadata: metadata || {},
        p_created_by: null
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding credits:', error);
      return null;
    }
  }

  public async spendCredits(
    userId: string,
    amount: number,
    description: string,
    referenceType?: string,
    referenceId?: string,
    metadata?: Record<string, any>
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('spend_user_credits', {
        p_user_id: userId,
        p_amount: amount,
        p_description: description,
        p_reference_type: referenceType,
        p_reference_id: referenceId,
        p_metadata: metadata || {}
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error spending credits:', error);
      return false;
    }
  }

  public async getTransactionHistory(
    userId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ transactions: CreditsTransaction[]; total: number } | null> {
    try {
      const offset = (page - 1) * limit;

      const { data, error, count } = await supabase
        .from('credits_transactions')
        .select('*', { count: 'exact' })
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      return {
        transactions: data || [],
        total: count || 0
      };
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return null;
    }
  }

  public async createReferral(
    referrerId: string,
    referredId: string,
    referralCode: string
  ): Promise<CreditsReferral | null> {
    try {
      const { data, error } = await supabase
        .from('credits_referrals')
        .insert({
          referrer_id: referrerId,
          referred_id: referredId,
          referral_code: referralCode,
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating referral:', error);
      return null;
    }
  }

  public async completeReferral(
    referralId: string,
    referrerBonus: number = 10.00,
    referredBonus: number = 5.00
  ): Promise<boolean> {
    try {
      const { data, error } = await supabase.rpc('complete_referral', {
        p_referral_id: referralId,
        p_referrer_bonus: referrerBonus,
        p_referred_bonus: referredBonus
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error completing referral:', error);
      return false;
    }
  }

  public async getEarningRules(): Promise<CreditsEarningRule[]> {
    try {
      const { data, error } = await supabase
        .from('credits_earning_rules')
        .select('*')
        .eq('is_active', true)
        .order('priority', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching earning rules:', error);
      return [];
    }
  }

  public async getRedemptionRules(): Promise<CreditsRedemptionRule[]> {
    try {
      const { data, error } = await supabase
        .from('credits_redemption_rules')
        .select('*')
        .eq('is_active', true);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching redemption rules:', error);
      return [];
    }
  }

  public async getTiers(): Promise<CreditsTier[]> {
    try {
      const { data, error } = await supabase
        .from('credits_tiers')
        .select('*')
        .order('tier_level', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching tiers:', error);
      return [];
    }
  }

  // Business logic methods
  public async processBookingCompletion(
    userId: string,
    bookingAmount: number,
    bookingId: string
  ): Promise<number | null> {
    try {
      // Calculate credits to award
      const creditsToAward = await this.calculateEarningAmount(bookingAmount, 'Bronze'); // Default tier

      // Award credits
      const newBalance = await this.addCredits(
        userId,
        creditsToAward,
        'earn',
        `Booking completion bonus - ${creditsToAward.toFixed(2)} credits`,
        'booking',
        bookingId,
        { booking_amount: bookingAmount, credits_percentage: 5 }
      );

      return newBalance;
    } catch (error) {
      console.error('Error processing booking completion:', error);
      return null;
    }
  }

  public async processReferralCompletion(
    referralId: string
  ): Promise<boolean> {
    try {
      return await this.completeReferral(referralId);
    } catch (error) {
      console.error('Error processing referral completion:', error);
      return false;
    }
  }

  public async validateAndCalculateRedemption(
    userId: string,
    requestedAmount: number,
    totalCost: number
  ): Promise<{
    canRedeem: boolean;
    maxRedemption: number;
    discount: number;
    finalAmount: number;
    error?: string;
  }> {
    try {
      const userCredits = await this.getUserCredits(userId);
      if (!userCredits) {
        return {
          canRedeem: false,
          maxRedemption: 0,
          discount: 0,
          finalAmount: totalCost,
          error: 'Unable to fetch user credits'
        };
      }

      // Check minimum balance
      if (userCredits.credits_balance < CREDITS_CONSTANTS.MIN_REDEMPTION_AMOUNT) {
        return {
          canRedeem: false,
          maxRedemption: 0,
          discount: 0,
          finalAmount: totalCost,
          error: `Minimum balance of $${CREDITS_CONSTANTS.MIN_REDEMPTION_AMOUNT} required`
        };
      }

      // Calculate max redemption (25% of total cost)
      const maxRedemption = Math.min(
        (totalCost * CREDITS_CONSTANTS.MAX_REDEMPTION_PERCENTAGE) / 100,
        userCredits.credits_balance
      );

      // Validate requested amount
      if (requestedAmount > maxRedemption) {
        return {
          canRedeem: false,
          maxRedemption,
          discount: 0,
          finalAmount: totalCost,
          error: `Maximum redemption is $${maxRedemption.toFixed(2)}`
        };
      }

      // Calculate tier discount
      const discount = await this.calculateRedemptionDiscount(requestedAmount, userCredits.current_tier);
      const finalAmount = totalCost - requestedAmount + discount;

      return {
        canRedeem: true,
        maxRedemption,
        discount,
        finalAmount
      };
    } catch (error) {
      console.error('Error validating redemption:', error);
      return {
        canRedeem: false,
        maxRedemption: 0,
        discount: 0,
        finalAmount: totalCost,
        error: 'Error calculating redemption'
      };
    }
  }

  // Utility methods
  private async getTierByName(tierName: string): Promise<CreditsTier | null> {
    try {
      const { data, error } = await supabase
        .from('credits_tiers')
        .select('*')
        .eq('tier_name', tierName)
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching tier:', error);
      return null;
    }
  }

  public formatCredits(amount: number): string {
    return `$${amount.toFixed(2)}`;
  }

  public getTierIcon(tierName: string): string {
    const tierIcons: Record<string, string> = {
      'Bronze': '🥉',
      'Silver': '🥈',
      'Gold': '🥇',
      'Platinum': '💎',
      'Diamond': '⭐'
    };
    return tierIcons[tierName] || '⭐';
  }

  public getTierColor(tierName: string): string {
    const tierColors: Record<string, string> = {
      'Bronze': 'text-amber-600',
      'Silver': 'text-gray-400',
      'Gold': 'text-yellow-500',
      'Platinum': 'text-purple-500',
      'Diamond': 'text-gray-600'
    };
    return tierColors[tierName] || 'text-gray-600';
  }
}

// Export singleton instance
export const creditsService = CreditsService.getInstance();

// Export utility functions
export const formatCredits = (amount: number): string => creditsService.formatCredits(amount);
export const getTierIcon = (tierName: string): string => creditsService.getTierIcon(tierName);
export const getTierColor = (tierName: string): string => creditsService.getTierColor(tierName);
