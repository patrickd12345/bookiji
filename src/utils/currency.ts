// DEPRECATED: This file is replaced by the new i18n system
// Migration: Use @/lib/i18n/config instead
// Will be removed in next major version


/**
 * @deprecated Use detectLocaleFromHeaders from @/lib/i18n/config instead
 * This function will be removed in v2.0.0
 */
export function detectUserLocale(): string {
  console.warn('detectUserLocale is deprecated. Use detectLocaleFromHeaders from @/lib/i18n/config instead')
  return 'en-US'
}

/**
 * @deprecated Use getCountryInfo from @/lib/i18n/config instead 
 * This function will be removed in v2.0.0
 */
export function getCountryCode(): string {
  console.warn('getCountryCode is deprecated. Use getCountryInfo from @/lib/i18n/config instead')
  return 'US'
}

// Re-export new i18n functions for migration
export { detectLocaleFromHeaders, getCountryInfo, getCurrencyInfo } from '@/lib/i18n/config' 