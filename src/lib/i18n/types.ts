export interface SupportedLocale {
  code: string           // e.g., 'en-US', 'fr-FR', 'es-ES'
  name: string          // e.g., 'English (US)', 'Français (France)'
  currency: string      // e.g., 'usd', 'eur', 'gbp'
  country: string       // e.g., 'US', 'FR', 'ES'
  rtl: boolean         // Right-to-left support
  dateFormat: string   // e.g., 'MM/dd/yyyy', 'dd/MM/yyyy'
  timeFormat: '12h' | '24h'
}

export interface CurrencyInfo {
  code: string          // 'usd', 'eur', 'gbp'
  symbol: string        // '$', '€', '£'
  name: string          // 'US Dollar', 'Euro', 'British Pound'
  decimals: number      // 2 for most, 0 for JPY/KRW
  bookingFee: number    // Fee in smallest unit (cents)
  tier: 1 | 2 | 3      // Pricing tier
}

export interface CountryInfo {
  code: string          // 'US', 'FR', 'DE'
  name: string          // 'United States', 'France', 'Germany' 
  currency: string      // 'usd', 'eur', 'eur'
  continent: string     // 'North America', 'Europe', 'Asia'
  timezone: string      // 'America/New_York', 'Europe/Paris'
  emergingMarket: boolean
}

export interface TranslationKey {
  [key: string]: string | TranslationKey
}

export interface Translations {
  [locale: string]: TranslationKey
}

// Hook return type for i18n
export interface I18nHook {
  locale: string
  currency: string
  country: string
  t: (key: string, params?: Record<string, string>) => string
  formatCurrency: (amount: number) => string
  formatDate: (date: Date) => string
  formatTime: (date: Date) => string
  setLocale: (locale: string) => void
} 