// DEPRECATED: This file is replaced by the new i18n system
// Migration: Use @/lib/i18n/config instead
// Will be removed in next major version

export interface BookingFee {
  /**
   * Amount expressed in the currency's smallest unit (for most currencies that means cents,
   * for zero-decimal currencies like JPY or KRW it is the major unit).
   */
  amount: number;
  /** ISO-4217 lowercase currency code understood by Stripe */
  currency: string;
}

// Default booking fee (fallback for deprecated functions)
export const DEFAULT_BOOKING_FEE = {
  amount: 100, // $1.00 in cents
  currency: 'USD'
}

/**
 * @deprecated Use getCurrencyInfo from @/lib/i18n/config instead
 * This function will be removed in v2.0.0
 */
export function getBookingFeeForCurrency(currency: string): number {
  console.warn(`getBookingFeeForCurrency is deprecated for currency ${currency}. Use getCurrencyInfo from @/lib/i18n/config instead`)
  return DEFAULT_BOOKING_FEE.amount
}

/**
 * @deprecated Use CURRENCIES from @/lib/i18n/config instead
 * This constant will be removed in v2.0.0
 */
export const BOOKING_FEE_MATRIX = {
  USD: DEFAULT_BOOKING_FEE.amount
}

// Re-export from new i18n system for backward compatibility
export { getCurrencyInfo } from '@/lib/i18n/config' 