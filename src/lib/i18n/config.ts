import { SupportedLocale, CurrencyInfo, CountryInfo } from './types'

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
  ZA: { code: 'ZA', name: 'South Africa', currency: 'zar', continent: 'Africa', timezone: 'Africa/Johannesburg', emergingMarket: true },
  NG: { code: 'NG', name: 'Nigeria', currency: 'ngn', continent: 'Africa', timezone: 'Africa/Lagos', emergingMarket: true },
  
  // South America
  BR: { code: 'BR', name: 'Brazil', currency: 'brl', continent: 'South America', timezone: 'America/Sao_Paulo', emergingMarket: true },
  AR: { code: 'AR', name: 'Argentina', currency: 'ars', continent: 'South America', timezone: 'America/Argentina/Buenos_Aires', emergingMarket: true },
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