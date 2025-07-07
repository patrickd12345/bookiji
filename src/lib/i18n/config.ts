import { SupportedLocale, CurrencyInfo, CountryInfo } from './types'
import { getPPPVendorFee, getPPPCustomerFee } from '@/lib/ppp'

// 🌍 COMPREHENSIVE CURRENCY CONFIGURATION
export const CURRENCIES: Record<string, CurrencyInfo> = {
  // Tier 1: Major developed markets
  usd: { code: 'usd', symbol: '$', name: 'US Dollar', decimals: 2, bookingFee: 100, tier: 1 },
  eur: { code: 'eur', symbol: '€', name: 'Euro', decimals: 2, bookingFee: 100, tier: 1 },
  gbp: { code: 'gbp', symbol: '£', name: 'British Pound', decimals: 2, bookingFee: 100, tier: 1 },
  cad: { code: 'cad', symbol: 'C$', name: 'Canadian Dollar', decimals: 2, bookingFee: 100, tier: 1 },
  aud: { code: 'aud', symbol: 'A$', name: 'Australian Dollar', decimals: 2, bookingFee: 100, tier: 1 },
  nzd: { code: 'nzd', symbol: 'NZ$', name: 'New Zealand Dollar', decimals: 2, bookingFee: 100, tier: 1 },
  chf: { code: 'chf', symbol: 'CHF', name: 'Swiss Franc', decimals: 2, bookingFee: 100, tier: 1 },
  
  // Tier 2: Advanced emerging markets
  jpy: { code: 'jpy', symbol: '¥', name: 'Japanese Yen', decimals: 0, bookingFee: 100, tier: 2 },
  krw: { code: 'krw', symbol: '₩', name: 'South Korean Won', decimals: 0, bookingFee: 1000, tier: 2 },
  hkd: { code: 'hkd', symbol: 'HK$', name: 'Hong Kong Dollar', decimals: 2, bookingFee: 800, tier: 2 },
  sgd: { code: 'sgd', symbol: 'S$', name: 'Singapore Dollar', decimals: 2, bookingFee: 150, tier: 2 },
  pln: { code: 'pln', symbol: 'zł', name: 'Polish Zloty', decimals: 2, bookingFee: 300, tier: 2 },
  mxn: { code: 'mxn', symbol: 'MX$', name: 'Mexican Peso', decimals: 2, bookingFee: 1000, tier: 2 },
  brl: { code: 'brl', symbol: 'R$', name: 'Brazilian Real', decimals: 2, bookingFee: 300, tier: 2 },
  ils: { code: 'ils', symbol: '₪', name: 'Israeli New Shekel', decimals: 2, bookingFee: 200, tier: 2 },
  
  // Tier 3: Emerging markets with adjusted pricing
  inr: { code: 'inr', symbol: '₹', name: 'Indian Rupee', decimals: 2, bookingFee: 5000, tier: 3 },
  idr: { code: 'idr', symbol: 'Rp', name: 'Indonesian Rupiah', decimals: 0, bookingFee: 10000, tier: 3 },
  vnd: { code: 'vnd', symbol: '₫', name: 'Vietnamese Dong', decimals: 0, bookingFee: 20000, tier: 3 },
  thb: { code: 'thb', symbol: '฿', name: 'Thai Baht', decimals: 2, bookingFee: 2000, tier: 3 },
  php: { code: 'php', symbol: '₱', name: 'Philippine Peso', decimals: 2, bookingFee: 3000, tier: 3 },
  myr: { code: 'myr', symbol: 'RM', name: 'Malaysian Ringgit', decimals: 2, bookingFee: 400, tier: 3 },
  ngn: { code: 'ngn', symbol: '₦', name: 'Nigerian Naira', decimals: 2, bookingFee: 50000, tier: 3 },
  zar: { code: 'zar', symbol: 'R', name: 'South African Rand', decimals: 2, bookingFee: 1000, tier: 3 },
  
  // Additional major currencies
  sek: { code: 'sek', symbol: 'kr', name: 'Swedish Krona', decimals: 2, bookingFee: 1000, tier: 2 },
  nok: { code: 'nok', symbol: 'kr', name: 'Norwegian Krone', decimals: 2, bookingFee: 1000, tier: 2 },
  dkk: { code: 'dkk', symbol: 'kr', name: 'Danish Krone', decimals: 2, bookingFee: 700, tier: 2 },
  try: { code: 'try', symbol: '₺', name: 'Turkish Lira', decimals: 2, bookingFee: 2000, tier: 3 },
  ars: { code: 'ars', symbol: '$', name: 'Argentine Peso', decimals: 2, bookingFee: 10000, tier: 3 },
}

// 💰 VENDOR FEE CONFIGURATION
// Based on 15% of average service price by category (USD base values in cents)
export const VENDOR_FEES_USD: Record<string, number> = {
  // High-value services (15% of average $200+ service)
  'Health & Medical': 3000,        // 15% of $200 = $30.00
  'Professional Services': 1800,    // 15% of $120 = $18.00
  'Legal Services': 3000,           // 15% of $200 = $30.00
  'Financial Services': 2250,       // 15% of $150 = $22.50
  
  // Personal care services (15% of average $60-100 service)
  'Beauty & Wellness': 900,         // 15% of $60 = $9.00
  'Hair & Styling': 1200,           // 15% of $80 = $12.00
  'Nails & Spa': 1050,              // 15% of $70 = $10.50
  'Massage & Therapy': 1350,        // 15% of $90 = $13.50
  'Fitness & Training': 1200,       // 15% of $80 = $12.00
  
  // Home services (15% of average $50-100 service)
  'Home Services': 1200,            // 15% of $80 = $12.00
  'Cleaning & Maintenance': 900,    // 15% of $60 = $9.00
  'Repairs & Installation': 1350,   // 15% of $90 = $13.50
  'Plumbing': 1500,                 // 15% of $100 = $15.00
  'Electrical': 1500,               // 15% of $100 = $15.00
  
  // Creative and specialized services
  'Creative Services': 1200,        // 15% of $80 = $12.00
  'Photography & Video': 1500,      // 15% of $100 = $15.00
  'Event Services': 1800,           // 15% of $120 = $18.00
  
  // Transportation and automotive
  'Automotive': 750,                // 15% of $50 = $7.50
  'Transportation': 900,            // 15% of $60 = $9.00
  
  // Education and consulting
  'Tutoring & Education': 1200,     // 15% of $80 = $12.00
  'Consulting': 1800,               // 15% of $120 = $18.00
  
  // Pet and specialized services
  'Pet Services': 900,              // 15% of $60 = $9.00
  
  // Default for uncategorized services
  'Other': 600                      // 15% of $40 = $6.00
}

// 🏷️ SERVICE CATEGORY MAPPING
// Maps service categories to their fee tiers for consistent pricing
export const SERVICE_CATEGORY_MAPPING: Record<string, string> = {
  // Medical and health
  'Health & Medical': 'Health & Medical',
  'Medical': 'Health & Medical',
  'Dental': 'Health & Medical',
  
  // Professional services
  'Professional Services': 'Professional Services',
  'Legal Services': 'Legal Services',
  'Financial Services': 'Financial Services',
  'Consulting': 'Consulting',
  'Business Services': 'Professional Services',
  
  // Beauty and personal care
  'Beauty & Wellness': 'Beauty & Wellness',
  'Hair & Styling': 'Hair & Styling',
  'Nails & Spa': 'Nails & Spa',
  'Massage & Therapy': 'Massage & Therapy',
  'Spa': 'Nails & Spa',
  'Salon': 'Hair & Styling',
  
  // Fitness and wellness
  'Fitness & Training': 'Fitness & Training',
  'Personal Training': 'Fitness & Training',
  'Yoga': 'Fitness & Training',
  'Wellness': 'Beauty & Wellness',
  
  // Home services
  'Home Services': 'Home Services',
  'Cleaning & Maintenance': 'Cleaning & Maintenance',
  'Repairs & Installation': 'Repairs & Installation',
  'Plumbing': 'Plumbing',
  'Electrical': 'Electrical',
  'HVAC': 'Repairs & Installation',
  'Landscaping': 'Home Services',
  
  // Creative services
  'Creative Services': 'Creative Services',
  'Photography & Video': 'Photography & Video',
  'Event Services': 'Event Services',
  'Design': 'Creative Services',
  'Art': 'Creative Services',
  
  // Automotive and transportation
  'Automotive': 'Automotive',
  'Transportation': 'Transportation',
  'Car Service': 'Automotive',
  'Delivery': 'Transportation',
  
  // Education
  'Tutoring & Education': 'Tutoring & Education',
  'Education': 'Tutoring & Education',
  'Tutoring': 'Tutoring & Education',
  
  // Pet services
  'Pet Services': 'Pet Services',
  'Pet Care': 'Pet Services',
  'Veterinary': 'Pet Services',
  
  // Default
  'Other': 'Other'
}

// 🗺️ COMPREHENSIVE COUNTRY CONFIGURATION
export const COUNTRIES: Record<string, CountryInfo> = {
  // North America
  US: { code: 'US', name: 'United States', currency: 'usd', continent: 'North America', timezone: 'America/New_York', emergingMarket: false },
  CA: { code: 'CA', name: 'Canada', currency: 'cad', continent: 'North America', timezone: 'America/Toronto', emergingMarket: false },
  MX: { code: 'MX', name: 'Mexico', currency: 'mxn', continent: 'North America', timezone: 'America/Mexico_City', emergingMarket: true },
  
  // Europe
  GB: { code: 'GB', name: 'United Kingdom', currency: 'gbp', continent: 'Europe', timezone: 'Europe/London', emergingMarket: false },
  DE: { code: 'DE', name: 'Germany', currency: 'eur', continent: 'Europe', timezone: 'Europe/Berlin', emergingMarket: false },
  FR: { code: 'FR', name: 'France', currency: 'eur', continent: 'Europe', timezone: 'Europe/Paris', emergingMarket: false },
  ES: { code: 'ES', name: 'Spain', currency: 'eur', continent: 'Europe', timezone: 'Europe/Madrid', emergingMarket: false },
  IT: { code: 'IT', name: 'Italy', currency: 'eur', continent: 'Europe', timezone: 'Europe/Rome', emergingMarket: false },
  NL: { code: 'NL', name: 'Netherlands', currency: 'eur', continent: 'Europe', timezone: 'Europe/Amsterdam', emergingMarket: false },
  CH: { code: 'CH', name: 'Switzerland', currency: 'chf', continent: 'Europe', timezone: 'Europe/Zurich', emergingMarket: false },
  SE: { code: 'SE', name: 'Sweden', currency: 'sek', continent: 'Europe', timezone: 'Europe/Stockholm', emergingMarket: false },
  NO: { code: 'NO', name: 'Norway', currency: 'nok', continent: 'Europe', timezone: 'Europe/Oslo', emergingMarket: false },
  DK: { code: 'DK', name: 'Denmark', currency: 'dkk', continent: 'Europe', timezone: 'Europe/Copenhagen', emergingMarket: false },
  PL: { code: 'PL', name: 'Poland', currency: 'pln', continent: 'Europe', timezone: 'Europe/Warsaw', emergingMarket: true },
  TR: { code: 'TR', name: 'Turkey', currency: 'try', continent: 'Europe', timezone: 'Europe/Istanbul', emergingMarket: true },
  
  // Asia-Pacific
  JP: { code: 'JP', name: 'Japan', currency: 'jpy', continent: 'Asia', timezone: 'Asia/Tokyo', emergingMarket: false },
  KR: { code: 'KR', name: 'South Korea', currency: 'krw', continent: 'Asia', timezone: 'Asia/Seoul', emergingMarket: false },
  CN: { code: 'CN', name: 'China', currency: 'usd', continent: 'Asia', timezone: 'Asia/Shanghai', emergingMarket: true }, // Special case - USD for international
  HK: { code: 'HK', name: 'Hong Kong', currency: 'hkd', continent: 'Asia', timezone: 'Asia/Hong_Kong', emergingMarket: false },
  SG: { code: 'SG', name: 'Singapore', currency: 'sgd', continent: 'Asia', timezone: 'Asia/Singapore', emergingMarket: false },
  AU: { code: 'AU', name: 'Australia', currency: 'aud', continent: 'Oceania', timezone: 'Australia/Sydney', emergingMarket: false },
  NZ: { code: 'NZ', name: 'New Zealand', currency: 'nzd', continent: 'Oceania', timezone: 'Pacific/Auckland', emergingMarket: false },
  IN: { code: 'IN', name: 'India', currency: 'inr', continent: 'Asia', timezone: 'Asia/Kolkata', emergingMarket: true },
  ID: { code: 'ID', name: 'Indonesia', currency: 'idr', continent: 'Asia', timezone: 'Asia/Jakarta', emergingMarket: true },
  TH: { code: 'TH', name: 'Thailand', currency: 'thb', continent: 'Asia', timezone: 'Asia/Bangkok', emergingMarket: true },
  VN: { code: 'VN', name: 'Vietnam', currency: 'vnd', continent: 'Asia', timezone: 'Asia/Ho_Chi_Minh', emergingMarket: true },
  PH: { code: 'PH', name: 'Philippines', currency: 'php', continent: 'Asia', timezone: 'Asia/Manila', emergingMarket: true },
  MY: { code: 'MY', name: 'Malaysia', currency: 'myr', continent: 'Asia', timezone: 'Asia/Kuala_Lumpur', emergingMarket: true },
  
  // Middle East & Africa
  IL: { code: 'IL', name: 'Israel', currency: 'ils', continent: 'Asia', timezone: 'Asia/Jerusalem', emergingMarket: false },
  NG: { code: 'NG', name: 'Nigeria', currency: 'ngn', continent: 'Africa', timezone: 'Africa/Lagos', emergingMarket: true },
  ZA: { code: 'ZA', name: 'South Africa', currency: 'zar', continent: 'Africa', timezone: 'Africa/Johannesburg', emergingMarket: true },
  AR: { code: 'AR', name: 'Argentina', currency: 'ars', continent: 'South America', timezone: 'America/Argentina/Buenos_Aires', emergingMarket: true },
  BR: { code: 'BR', name: 'Brazil', currency: 'brl', continent: 'South America', timezone: 'America/Sao_Paulo', emergingMarket: true },
}

// 🌐 SUPPORTED LOCALES CONFIGURATION
export const SUPPORTED_LOCALES: Record<string, SupportedLocale> = {
  'en-US': { code: 'en-US', name: 'English (US)', currency: 'usd', country: 'US', rtl: false, dateFormat: 'MM/dd/yyyy', timeFormat: '12h' },
  'en-GB': { code: 'en-GB', name: 'English (UK)', currency: 'gbp', country: 'GB', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  'en-AU': { code: 'en-AU', name: 'English (Australia)', currency: 'aud', country: 'AU', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  'en-CA': { code: 'en-CA', name: 'English (Canada)', currency: 'cad', country: 'CA', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '12h' },
  
  'fr-FR': { code: 'fr-FR', name: 'Français (France)', currency: 'eur', country: 'FR', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  'fr-CA': { code: 'fr-CA', name: 'Français (Canada)', currency: 'cad', country: 'CA', rtl: false, dateFormat: 'yyyy-MM-dd', timeFormat: '24h' },
  
  'de-DE': { code: 'de-DE', name: 'Deutsch (Deutschland)', currency: 'eur', country: 'DE', rtl: false, dateFormat: 'dd.MM.yyyy', timeFormat: '24h' },
  'de-CH': { code: 'de-CH', name: 'Deutsch (Schweiz)', currency: 'chf', country: 'CH', rtl: false, dateFormat: 'dd.MM.yyyy', timeFormat: '24h' },
  
  'es-ES': { code: 'es-ES', name: 'Español (España)', currency: 'eur', country: 'ES', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  'es-MX': { code: 'es-MX', name: 'Español (México)', currency: 'mxn', country: 'MX', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '12h' },
  
  'it-IT': { code: 'it-IT', name: 'Italiano (Italia)', currency: 'eur', country: 'IT', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  
  'ja-JP': { code: 'ja-JP', name: '日本語 (日本)', currency: 'jpy', country: 'JP', rtl: false, dateFormat: 'yyyy/MM/dd', timeFormat: '24h' },
  'ko-KR': { code: 'ko-KR', name: '한국어 (대한민국)', currency: 'krw', country: 'KR', rtl: false, dateFormat: 'yyyy.MM.dd', timeFormat: '12h' },
  'zh-CN': { code: 'zh-CN', name: '中文 (中国)', currency: 'usd', country: 'CN', rtl: false, dateFormat: 'yyyy-MM-dd', timeFormat: '24h' },
  
  'pt-BR': { code: 'pt-BR', name: 'Português (Brasil)', currency: 'brl', country: 'BR', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  
  'hi-IN': { code: 'hi-IN', name: 'हिन्दी (भारत)', currency: 'inr', country: 'IN', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '12h' },
  'th-TH': { code: 'th-TH', name: 'ไทย (ประเทศไทย)', currency: 'thb', country: 'TH', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
  'vi-VN': { code: 'vi-VN', name: 'Tiếng Việt (Việt Nam)', currency: 'vnd', country: 'VN', rtl: false, dateFormat: 'dd/MM/yyyy', timeFormat: '24h' },
}

// 🚀 DEFAULT CONFIGURATION
export const DEFAULT_LOCALE = 'en-US'
export const DEFAULT_CURRENCY = 'usd'
export const DEFAULT_COUNTRY = 'US'

// 🔍 HELPER FUNCTIONS
export function getCurrencyInfo(currencyCode: string): CurrencyInfo {
  return CURRENCIES[currencyCode.toLowerCase()] || CURRENCIES[DEFAULT_CURRENCY]
}

export function getCountryInfo(countryCode: string): CountryInfo {
  return COUNTRIES[countryCode.toUpperCase()] || COUNTRIES[DEFAULT_COUNTRY]
}

export function getLocaleInfo(localeCode: string): SupportedLocale {
  return SUPPORTED_LOCALES[localeCode] || SUPPORTED_LOCALES[DEFAULT_LOCALE]
}

export function detectLocaleFromHeaders(acceptLanguage?: string): SupportedLocale {
  if (!acceptLanguage) return SUPPORTED_LOCALES[DEFAULT_LOCALE]
  
  // Parse Accept-Language header priority
  const languages = acceptLanguage
    .split(',')
    .map(lang => lang.trim().split(';')[0])
    .filter(Boolean)
  
  // Try to find exact match first
  for (const lang of languages) {
    if (SUPPORTED_LOCALES[lang]) {
      return SUPPORTED_LOCALES[lang]
    }
  }
  
  // Try language-only match (e.g., 'en' matches 'en-US')
  for (const lang of languages) {
    const langPrefix = lang.split('-')[0]
    const matchingLocale = Object.values(SUPPORTED_LOCALES).find(
      locale => locale.code.startsWith(langPrefix + '-')
    )
    if (matchingLocale) return matchingLocale
  }
  
  return SUPPORTED_LOCALES[DEFAULT_LOCALE]
}

// 💰 VENDOR FEE CALCULATION FUNCTIONS

/**
 * Get the normalized service category for fee calculation
 * Maps various category names to standardized fee categories
 */
export function getNormalizedServiceCategory(category: string): string {
  const normalized = SERVICE_CATEGORY_MAPPING[category]
  return normalized || 'Other'
}

/**
 * Get vendor fee in USD cents for a given service category
 * @param category - Service category (will be normalized)
 * @returns Fee amount in USD cents
 */
export function getVendorFeeUSD(category: string): number {
  const normalizedCategory = getNormalizedServiceCategory(category)
  return VENDOR_FEES_USD[normalizedCategory] || VENDOR_FEES_USD['Other']
}

/**
 * Get vendor fee for a given service category and currency
 * @param category - Service category (will be normalized)
 * @param currency - Currency code (e.g., 'usd', 'inr', 'jpy')
 * @returns Fee amount in the specified currency's smallest unit (cents for most currencies)
 */
export function getVendorFee(category: string, currency: string = 'usd'): number {
  const usdFee = getVendorFeeUSD(category)
  
  // 🌍 Use real PPP calculations for accurate economic fairness
  try {
    return getPPPVendorFee(usdFee, currency)
  } catch (_error) {
    // Fallback to legacy tier-based system if PPP module not available
    const currencyInfo = getCurrencyInfo(currency)
    
    // 🎯 EQUAL PAYMENT EFFORT SCALING (Legacy)
  const baseMultiplier = currencyInfo.bookingFee / 100 // USD commitment fee is 100 cents
  let equalEffortMultiplier = baseMultiplier
  
  // Apply equal effort adjustments based on currency tier
  if (currencyInfo.tier === 3) {
    equalEffortMultiplier = baseMultiplier * 0.25 // 25% of base to achieve equal effort
  } else if (currencyInfo.tier === 2) {
    equalEffortMultiplier = baseMultiplier * 0.5 // 50% of base to achieve equal effort
  }
  
  return Math.round(usdFee * equalEffortMultiplier)
  }
}

/**
 * Get vendor fee with proper formatting for display
 * @param category - Service category
 * @param currency - Currency code
 * @returns Formatted fee string (e.g., "$30.00", "₹1,500", "¥3,000")
 */
export function getFormattedVendorFee(category: string, currency: string = 'usd'): string {
  const fee = getVendorFee(category, currency)
  const currencyInfo = getCurrencyInfo(currency)
  
  // Format based on currency decimals
  if (currencyInfo.decimals === 0) {
    // For zero-decimal currencies like JPY, KRW
    return `${currencyInfo.symbol}${fee.toLocaleString()}`
  } else {
    // For decimal currencies, convert from smallest unit
    const amount = fee / Math.pow(10, currencyInfo.decimals)
    return `${currencyInfo.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: currencyInfo.decimals, maximumFractionDigits: currencyInfo.decimals })}`
  }
}

/**
 * Get vendor fee breakdown for transparency
 * @param category - Service category
 * @param currency - Currency code
 * @returns Object with fee details
 */
export function getVendorFeeBreakdown(category: string, currency: string = 'usd') {
  const normalizedCategory = getNormalizedServiceCategory(category)
  const usdFee = getVendorFeeUSD(category)
  const localFee = getVendorFee(category, currency)
  const currencyInfo = getCurrencyInfo(currency)
  
  return {
    category: normalizedCategory,
    usdFee: usdFee / 100, // Convert to dollars
    localFee: localFee,
    localFeeFormatted: getFormattedVendorFee(category, currency),
    currency: currency,
    currencySymbol: currencyInfo.symbol,
    percentage: 15, // Always 15% of average service price
    description: `15% of average ${normalizedCategory} service price`
  }
}

/**
 * Get customer commitment fee using PPP calculations
 * @param currency - Currency code
 * @returns Fee amount in local currency cents
 */
export function getCustomerFee(currency: string = 'usd'): number {
  // 🌍 Use real PPP calculations for accurate economic fairness
  try {
    return getPPPCustomerFee(currency)
  } catch (_error) {
    // Fallback to legacy tier-based system if PPP module not available
    const currencyInfo = getCurrencyInfo(currency)
    return currencyInfo.bookingFee
  }
}

/**
 * Get formatted customer fee for display
 * @param currency - Currency code
 * @returns Formatted fee string (e.g., "$1.00", "₹50", "¥100")
 */
export function getFormattedCustomerFee(currency: string = 'usd'): string {
  const fee = getCustomerFee(currency)
  const currencyInfo = getCurrencyInfo(currency)
  
  // Format based on currency decimals
  if (currencyInfo.decimals === 0) {
    // For zero-decimal currencies like JPY, KRW
    return `${currencyInfo.symbol}${fee.toLocaleString()}`
  } else {
    // For decimal currencies, convert from smallest unit
    const amount = fee / Math.pow(10, currencyInfo.decimals)
    return `${currencyInfo.symbol}${amount.toLocaleString(undefined, { minimumFractionDigits: currencyInfo.decimals, maximumFractionDigits: currencyInfo.decimals })}`
  }
}

/**
 * Get customer fee breakdown for transparency
 * @param currency - Currency code
 * @returns Object with fee details
 */
export function getCustomerFeeBreakdown(currency: string = 'usd') {
  const fee = getCustomerFee(currency)
  const currencyInfo = getCurrencyInfo(currency)
  
  return {
    usdFee: 1.0, // Always $1.00 base
    localFee: fee,
    localFeeFormatted: getFormattedCustomerFee(currency),
    currency: currency,
    currencySymbol: currencyInfo.symbol,
    description: `Commitment fee adjusted for ${currency.toUpperCase()} purchasing power`
  }
} 