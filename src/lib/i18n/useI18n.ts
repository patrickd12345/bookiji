'use client'

import { useState, useEffect, useCallback } from 'react'
import { I18nHook } from './types'
import baseTranslations from '@/locales/en-US.json'
import { 
  SUPPORTED_LOCALES, 
  DEFAULT_LOCALE, 
  getCurrencyInfo, 
  getCountryInfo, 
  getLocaleInfo,
  detectLocaleFromHeaders 
} from './config'

// 🌍 GLOBAL I18N STATE (simple client-side state management)
let globalLocale = DEFAULT_LOCALE
let localeChangeListeners: ((locale: string) => void)[] = []

// 📚 Loaded translations cache
const translationCache: Record<string, Record<string, string>> = {}

async function loadTranslations(locale: string): Promise<Record<string, string>> {
  if (translationCache[locale]) return translationCache[locale]
  try {
    const translations = (await import(`../../../locales/${locale}.json`)).default
    translationCache[locale] = translations
    return translations
  } catch (err) {
    const fallback = (await import(`../../../locales/en-US.json`)).default
    translationCache[locale] = fallback
    return fallback
  }
}

// 🔄 LOCALE PERSISTENCE
function saveLocaleToStorage(locale: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('bookiji-locale', locale)
  }
}

function loadLocaleFromStorage(): string {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('bookiji-locale') || DEFAULT_LOCALE
  }
  return DEFAULT_LOCALE
}

// 🌐 AUTO-DETECT LOCALE ON FIRST VISIT
function detectInitialLocale(): string {
  // 1. Check localStorage first
  const stored = loadLocaleFromStorage()
  if (stored && SUPPORTED_LOCALES[stored]) {
    return stored
  }
  
  // 2. Detect from browser language
  if (typeof navigator !== 'undefined') {
    const detected = detectLocaleFromHeaders(navigator.language)
    return detected.code
  }
  
  return DEFAULT_LOCALE
}

// 🔢 FORMATTING UTILITIES
function createCurrencyFormatter(locale: string, currency: string) {
  const currencyInfo = getCurrencyInfo(currency)
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency.toUpperCase(),
    minimumFractionDigits: currencyInfo.decimals,
    maximumFractionDigits: currencyInfo.decimals,
  })
}

function createDateFormatter(locale: string, options: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat(locale, options)
}

function createTimeFormatter(locale: string, timeFormat: '12h' | '24h') {
  return new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: timeFormat === '12h'
  })
}


// 🪝 MAIN I18N HOOK
export function useI18n(initialLocale?: string): I18nHook {
  const [currentLocale, setCurrentLocale] = useState<string>(() => {
    if (initialLocale && SUPPORTED_LOCALES[initialLocale]) {
      globalLocale = initialLocale
      return initialLocale
    }
    if (typeof window !== 'undefined') {
      return detectInitialLocale()
    }
    return DEFAULT_LOCALE
  })
  const [translations, setTranslations] = useState<Record<string, string>>({})

  // Load translations when locale changes
  useEffect(() => {
    loadTranslations(currentLocale).then(setTranslations)
  }, [currentLocale])

  // 📡 SUBSCRIBE TO GLOBAL LOCALE CHANGES
  useEffect(() => {
    const listener = (newLocale: string) => {
      setCurrentLocale(newLocale)
    }
    localeChangeListeners.push(listener)
    
    return () => {
      localeChangeListeners = localeChangeListeners.filter(l => l !== listener)
    }
  }, [])

  // 🔄 UPDATE GLOBAL LOCALE
  const setLocale = useCallback((newLocale: string) => {
    if (!SUPPORTED_LOCALES[newLocale]) {
      console.warn(`Locale ${newLocale} not supported, falling back to ${DEFAULT_LOCALE}`)
      newLocale = DEFAULT_LOCALE
    }
    
    globalLocale = newLocale
    saveLocaleToStorage(newLocale)
    
    // Notify all components
    localeChangeListeners.forEach(listener => listener(newLocale))
  }, [])

  // 📊 GET CURRENT LOCALE INFO
  const localeInfo = getLocaleInfo(currentLocale)
  const currencyInfo = getCurrencyInfo(localeInfo.currency)
  const countryInfo = getCountryInfo(localeInfo.country)

  // 💰 FORMAT CURRENCY
  const formatCurrency = useCallback((amount: number) => {
    const formatter = createCurrencyFormatter(currentLocale, localeInfo.currency)
    // Convert from cents to main unit if needed
    const displayAmount = currencyInfo.decimals > 0 
      ? amount / Math.pow(10, currencyInfo.decimals)
      : amount
    return formatter.format(displayAmount)
  }, [currentLocale, localeInfo.currency, currencyInfo.decimals])

  // 📅 FORMAT DATE
  const formatDate = useCallback((date: Date) => {
    const formatter = createDateFormatter(currentLocale, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
    return formatter.format(date)
  }, [currentLocale])

  // 🕐 FORMAT TIME
  const formatTime = useCallback((date: Date) => {
    const formatter = createTimeFormatter(currentLocale, localeInfo.timeFormat)
    return formatter.format(date)
  }, [currentLocale, localeInfo.timeFormat])

  // 🗣️ TRANSLATE FUNCTION
  const t = useCallback((key: string, variables?: Record<string, string>): string => {
    let text = translations[key] || baseTranslations[key] || key
    
    // Replace variables in the format {{variable}}
    if (variables) {
      Object.entries(variables).forEach(([key, value]) => {
        text = text.replace(new RegExp(`{{${key}}}`, 'g'), value)
      })
    }
    
    return text
  }, [translations])

  return {
    locale: currentLocale,
    currency: localeInfo.currency,
    country: localeInfo.country,
    t,
    formatCurrency,
    formatDate,
    formatTime,
    setLocale
  }
}

// 🌐 SERVER-SIDE LOCALE DETECTION
export function detectServerLocale(headers: Headers): string {
  const acceptLanguage = headers.get('accept-language')
  const detected = detectLocaleFromHeaders(acceptLanguage || undefined)
  return detected.code
}

// 🔧 UTILITY EXPORTS
export { SUPPORTED_LOCALES, getCurrencyInfo, getCountryInfo, getLocaleInfo } from './config'
