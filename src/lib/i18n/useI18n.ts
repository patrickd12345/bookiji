'use client'

import { useState, useEffect, useCallback } from 'react'
import { I18nHook } from './types'
import baseTranslations from '../../locales/en-US.json'
import frFR from '../../locales/fr-FR.json'
import deDE from '../../locales/de-DE.json'
import esES from '../../locales/es-ES.json'
import itIT from '../../locales/it-IT.json'
import jaJP from '../../locales/ja-JP.json'
import koKR from '../../locales/ko-KR.json'
import zhCN from '../../locales/zh-CN.json'
import ptBR from '../../locales/pt-BR.json'
import hiIN from '../../locales/hi-IN.json'
import thTH from '../../locales/th-TH.json'
import viVN from '../../locales/vi-VN.json'
import frCA from '../../locales/fr-CA.json'
import esMX from '../../locales/es-MX.json'
import enCA from '../../locales/en-CA.json'
import enGB from '../../locales/en-GB.json'
import enAU from '../../locales/en-AU.json'
import deCH from '../../locales/de-CH.json'
import { 
  SUPPORTED_LOCALES, 
  DEFAULT_LOCALE, 
  getCurrencyInfo, 
  getLocaleInfo,
  detectLocaleFromHeaders
} from './config'

// 🌍 GLOBAL I18N STATE (simple client-side state management)
let localeChangeListeners: ((locale: string) => void)[] = []

// 📚 Missing key warnings cache
const missingKeyWarnings = new Set<string>()

// 🌍 STATIC TRANSLATIONS MAP
const STATIC_TRANSLATIONS: Record<string, Record<string, string>> = {
  'en-US': baseTranslations,
  'fr-FR': frFR,
  'de-DE': deDE,
  'es-ES': esES,
  'it-IT': itIT,
  'ja-JP': jaJP,
  'ko-KR': koKR,
  'zh-CN': zhCN,
  'pt-BR': ptBR,
  'hi-IN': hiIN,
  'th-TH': thTH,
  'vi-VN': viVN,
  'fr-CA': frCA,
  'es-MX': esMX,
  'en-CA': enCA,
  'en-GB': enGB,
  'en-AU': enAU,
  'de-CH': deCH
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
    // Always use the initialLocale on first render to ensure SSR consistency
    if (initialLocale && SUPPORTED_LOCALES[initialLocale]) {
      return initialLocale
    }
    return DEFAULT_LOCALE
  })
  

  // 🔄 DETECT AND SYNC CLIENT-SIDE LOCALE AFTER HYDRATION
  useEffect(() => {
    // Only run on client after hydration
    if (typeof window === 'undefined') return
    
    // Add a small delay to ensure hydration is complete
    const timer = setTimeout(() => {
      // Check if we should override the initial locale with stored preference
      const storedLocale = loadLocaleFromStorage()
      if (storedLocale && SUPPORTED_LOCALES[storedLocale] && storedLocale !== currentLocale) {
        setCurrentLocale(storedLocale)
        return
      }
      
      // If no stored locale, detect from browser language
      if (!storedLocale) {
        const detected = detectLocaleFromHeaders(navigator.language)
        if (detected.code !== currentLocale && SUPPORTED_LOCALES[detected.code]) {
          setCurrentLocale(detected.code)
        }
      }
    }, 100) // Small delay to ensure hydration is complete
    
    return () => clearTimeout(timer)
  }, [currentLocale]) // Removed translations dependency to prevent unnecessary re-runs

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
      console.warn(`⚠️ Locale ${newLocale} not supported, falling back to ${DEFAULT_LOCALE}`)
      newLocale = DEFAULT_LOCALE
    }
    
    saveLocaleToStorage(newLocale)
    setCurrentLocale(newLocale)
    
    // Notify all other components
    localeChangeListeners.forEach(listener => {
      try {
        listener(newLocale)
      } catch (error) {
        console.error(`❌ Error in locale change listener:`, error)
      }
    })
  }, [])

  // 🗣️ TRANSLATE FUNCTION
  const t = useCallback((key: string, variables?: Record<string, string>): string => {
    // Resolve messages directly from the static map using current locale
    const messages = STATIC_TRANSLATIONS[currentLocale] || baseTranslations
    let text = (messages as Record<string,string>)[key]

    // Language-level fallback (e.g., fr-CA -> fr-FR, de-CH -> de-DE) if key missing
    if (text === undefined) {
      const langPrefix = currentLocale.split('-')[0]
      const fallbackLocale = Object.keys(STATIC_TRANSLATIONS).find(
        (code) => code !== currentLocale && code.startsWith(langPrefix + '-')
      )
      if (fallbackLocale) {
        const fallbackMessages = STATIC_TRANSLATIONS[fallbackLocale]
        text = (fallbackMessages as Record<string,string>)[key]
      }
    }

    // Base fallback
    if (text === undefined) {
      if (process.env.NODE_ENV !== 'production' && !missingKeyWarnings.has(key)) {
        missingKeyWarnings.add(key)
      }
      text = (baseTranslations as Record<string,string>)[key] || key
    }

    if (variables) {
      Object.entries(variables).forEach(([vKey, value]) => {
        text = text.replace(new RegExp(`{{${vKey}}}`, 'g'), value)
      })
    }

    return text
  }, [currentLocale])

  // 💰 CURRENCY FORMATTING
  const formatCurrency = useCallback((amount: number, currency?: string): string => {
    const currencyCode = currency || getLocaleInfo(currentLocale).currency
    const formatter = createCurrencyFormatter(currentLocale, currencyCode)
    return formatter.format(amount)
  }, [currentLocale])

  // 📅 DATE FORMATTING
  const formatDate = useCallback((date: Date, options?: Intl.DateTimeFormatOptions): string => {
    const defaultOptions: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      ...options
    }
    const formatter = createDateFormatter(currentLocale, defaultOptions)
    return formatter.format(date)
  }, [currentLocale])

  // 🕐 TIME FORMATTING
  const formatTime = useCallback((date: Date, timeFormat: '12h' | '24h' = '12h'): string => {
    const formatter = createTimeFormatter(currentLocale, timeFormat)
    return formatter.format(date)
  }, [currentLocale])

  // 🌍 LOCALE INFO
  const localeInfo = getLocaleInfo(currentLocale)

  return {
    // State
    locale: currentLocale,
    currency: localeInfo.currency,
    country: localeInfo.country,
    
    // Actions
    setLocale,
    
    // Translation
    t,
    
    // Formatting
    formatCurrency,
    formatDate,
    formatTime
  }
}