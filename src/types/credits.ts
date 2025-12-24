// Loyalty & Credits System Types
// Comprehensive type definitions for the credits system

export interface CreditsTransaction {
  id: string;
  user_id: string;
  transaction_type: 'earn' | 'spend' | 'refund' | 'admin_adjustment';
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata: Record<string, any>;
  created_at: string;
  created_by?: string;
}

export interface CreditsEarningRule {
  id: string;
  rule_name: string;
  rule_type: 'percentage' | 'fixed' | 'tiered';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule_config: Record<string, any>;
  is_active: boolean;
  priority: number;
  created_at: string;
  updated_at: string;
}

export interface CreditsRedemptionRule {
  id: string;
  rule_name: string;
  rule_type: 'percentage' | 'fixed' | 'minimum_balance';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  rule_config: Record<string, any>;
  is_active: boolean;
  applies_to: string[];
  created_at: string;
  updated_at: string;
}

export interface CreditsTier {
  id: string;
  tier_name: string;
  tier_level: number;
  min_credits_earned: number;
  max_credits_earned?: number;
  bonus_multiplier: number;
  discount_percentage: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  benefits: Record<string, any>;
  created_at: string;
}

export interface CreditsReferral {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: 'pending' | 'completed' | 'expired';
  referrer_bonus: number;
  referred_bonus: number;
  completed_at?: string;
  created_at: string;
}

export interface UserCreditsSummary {
  id: string;
  email: string;
  credits_balance: number;
  total_credits_earned: number;
  total_credits_spent: number;
  current_tier: string;
  tier_level: number;
  bonus_multiplier: number;
  discount_percentage: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  benefits: Record<string, any>;
  total_referrals: number;
  completed_referrals: number;
}

export interface CreditsEarningConfig {
  percentage?: number;
  min_amount?: number;
  max_credits?: number;
  amount?: number;
  conditions?: string[];
  base_percentage?: number;
  tier_multipliers?: Record<string, number>;
}

export interface CreditsRedemptionConfig {
  min_balance?: number;
  max_percentage?: number;
  min_amount?: number;
  base_discount?: number;
  tier_discounts?: Record<string, number>;
}

export interface CreditsTierBenefits {
  description: string;
  icon: string;
  priority_support?: boolean;
  exclusive_offers?: boolean;
  dedicated_manager?: boolean;
}

// API Request/Response Types
export interface AddCreditsRequest {
  user_id: string;
  amount: number;
  transaction_type: 'earn' | 'refund' | 'admin_adjustment';
  description: string;
  reference_type?: string;
  reference_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface SpendCreditsRequest {
  user_id: string;
  amount: number;
  description: string;
  reference_type?: string;
  reference_id?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>;
}

export interface CreateReferralRequest {
  referrer_id: string;
  referred_id: string;
  referral_code: string;
}

export interface CompleteReferralRequest {
  referral_id: string;
  referrer_bonus?: number;
  referred_bonus?: number;
}

export interface UpdateEarningRuleRequest {
  rule_name: string;
  rule_type: 'percentage' | 'fixed' | 'tiered';
  rule_config: CreditsEarningConfig;
  is_active?: boolean;
  priority?: number;
}

export interface UpdateRedemptionRuleRequest {
  rule_name: string;
  rule_type: 'percentage' | 'fixed' | 'minimum_balance';
  rule_config: CreditsRedemptionConfig;
  is_active?: boolean;
  applies_to?: string[];
}

export interface UpdateTierRequest {
  tier_name: string;
  tier_level: number;
  min_credits_earned: number;
  max_credits_earned?: number;
  bonus_multiplier: number;
  discount_percentage: number;
  benefits: CreditsTierBenefits;
}

// API Response Types
export interface CreditsResponse {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
  message?: string;
}

export interface UserCreditsResponse extends CreditsResponse {
  data: UserCreditsSummary;
}

export interface CreditsTransactionsResponse extends CreditsResponse {
  data: CreditsTransaction[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
  };
}

export interface CreditsRulesResponse extends CreditsResponse {
  data: {
    earning_rules: CreditsEarningRule[];
    redemption_rules: CreditsRedemptionRule[];
    tiers: CreditsTier[];
  };
}

// Component Props Types
export interface CreditsDisplayProps {
  userId: string;
  showDetails?: boolean;
  className?: string;
}

export interface CreditsHistoryProps {
  userId: string;
  limit?: number;
  showPagination?: boolean;
}

export interface CreditsTierBadgeProps {
  tier: string;
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
  className?: string;
}

export interface CreditsRedemptionProps {
  userId: string;
  amount: number;
  onSuccess?: (newBalance: number) => void;
  onError?: (error: string) => void;
  className?: string;
}

// Utility Types
export type CreditsTransactionType = CreditsTransaction['transaction_type'];
export type CreditsRuleType = CreditsEarningRule['rule_type'] | CreditsRedemptionRule['rule_type'];
export type CreditsTierName = CreditsTier['tier_name'];

// Constants
export const CREDITS_CONSTANTS = {
  MIN_REDEMPTION_AMOUNT: 5.00,
  MAX_REDEMPTION_PERCENTAGE: 25,
  DEFAULT_REFERRAL_BONUS: 10.00,
  DEFAULT_WELCOME_BONUS: 5.00,
  BOOKING_CREDITS_PERCENTAGE: 5,
  MAX_BOOKING_CREDITS: 50.00,
} as const;

// Helper Functions Types
export interface CreditsCalculator {
  calculateEarningAmount(baseAmount: number, userTier: string): Promise<number>;
  calculateRedemptionDiscount(amount: number, userTier: string): Promise<number>;
  calculateTierUpgrade(creditsEarned: number): string;
  validateRedemption(amount: number, userBalance: number): boolean;
}
