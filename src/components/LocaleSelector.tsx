'use client'

import { useState } from 'react'
import { Globe, ChevronDown, Check } from 'lucide-react'
import { useI18n, SUPPORTED_LOCALES } from '@/lib/i18n/useI18n'

interface LocaleSelectorProps {
  className?: string
  showFlag?: boolean
  variant?: 'full' | 'compact' | 'icon-only'
}

export default function LocaleSelector({ 
  className = '', 
  showFlag = true, 
  variant = 'full' 
}: LocaleSelectorProps) {
  const { locale, setLocale, t } = useI18n()
  const [isOpen, setIsOpen] = useState(false)
  
  const currentLocaleInfo = SUPPORTED_LOCALES[locale]

  // Get flag emoji for country (simple implementation)
  const getFlagEmoji = (countryCode: string): string => {
    const flagMap: Record<string, string> = {
      US: '🇺🇸', CA: '🇨🇦', MX: '🇲🇽',
      GB: '🇬🇧', FR: '🇫🇷', DE: '🇩🇪', ES: '🇪🇸', IT: '🇮🇹', NL: '🇳🇱',
      CH: '🇨🇭', SE: '🇸🇪', NO: '🇳🇴', DK: '🇩🇰', PL: '🇵🇱', TR: '🇹🇷',
      JP: '🇯🇵', KR: '🇰🇷', CN: '🇨🇳', HK: '🇭🇰', SG: '🇸🇬', AU: '🇦🇺',
      NZ: '🇳🇿', IN: '🇮🇳', ID: '🇮🇩', TH: '🇹🇭', VN: '🇻🇳', PH: '🇵🇭',
      MY: '🇲🇾', IL: '🇮🇱', ZA: '🇿🇦', NG: '🇳🇬', BR: '🇧🇷', AR: '🇦🇷'
    }
    return flagMap[countryCode] || '🌍'
  }

  const handleLocaleChange = (newLocale: string) => {
    setLocale(newLocale)
    setIsOpen(false)
  }

  if (variant === 'icon-only') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`p-2 rounded-lg hover:bg-gray-100 transition-colors ${className}`}
          title="Change language"
        >
          <Globe size={20} className="text-gray-600" />
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-2 max-h-96 overflow-y-auto">
              {Object.values(SUPPORTED_LOCALES).map((localeInfo) => (
                <button
                  key={localeInfo.code}
                  onClick={() => handleLocaleChange(localeInfo.code)}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 flex items-center justify-between ${
                    locale === localeInfo.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    {showFlag && (
                      <span className="mr-3 text-lg">
                        {getFlagEmoji(localeInfo.country)}
                      </span>
                    )}
                    <span className="text-sm">{localeInfo.name}</span>
                  </div>
                  {locale === localeInfo.code && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (variant === 'compact') {
    return (
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${className}`}
        >
          {showFlag && (
            <span className="text-lg">{getFlagEmoji(currentLocaleInfo.country)}</span>
          )}
          <span className="text-sm font-medium">{currentLocaleInfo.code.split('-')[0].toUpperCase()}</span>
          <ChevronDown size={16} className="text-gray-400" />
        </button>
        
        {isOpen && (
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
            <div className="p-2 max-h-96 overflow-y-auto">
              {Object.values(SUPPORTED_LOCALES).map((localeInfo) => (
                <button
                  key={localeInfo.code}
                  onClick={() => handleLocaleChange(localeInfo.code)}
                  className={`w-full text-left px-3 py-2 rounded-md hover:bg-gray-50 flex items-center justify-between ${
                    locale === localeInfo.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="flex items-center">
                    {showFlag && (
                      <span className="mr-3 text-lg">
                        {getFlagEmoji(localeInfo.country)}
                      </span>
                    )}
                    <span className="text-sm">{localeInfo.name}</span>
                  </div>
                  {locale === localeInfo.code && (
                    <Check size={16} className="text-blue-600" />
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // Full variant
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-3 px-4 py-2 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors min-w-[200px] ${className}`}
      >
        <Globe size={20} className="text-gray-600" />
        <div className="flex items-center gap-2 flex-1">
          {showFlag && (
            <span className="text-lg">{getFlagEmoji(currentLocaleInfo.country)}</span>
          )}
          <span className="text-sm font-medium text-left">{currentLocaleInfo.name}</span>
        </div>
        <ChevronDown size={16} className="text-gray-400" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 z-50">
          <div className="p-2 max-h-96 overflow-y-auto">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-2">
              {t('locale.select_language_region')}
            </div>
            {Object.values(SUPPORTED_LOCALES).map((localeInfo) => (
              <button
                key={localeInfo.code}
                onClick={() => handleLocaleChange(localeInfo.code)}
                className={`w-full text-left px-3 py-3 rounded-md hover:bg-gray-50 flex items-center justify-between ${
                  locale === localeInfo.code ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                }`}
              >
                <div className="flex items-center">
                  {showFlag && (
                    <span className="mr-3 text-xl">
                      {getFlagEmoji(localeInfo.country)}
                    </span>
                  )}
                  <div>
                    <div className="text-sm font-medium">{localeInfo.name}</div>
                    <div className="text-xs text-gray-500">
                      {localeInfo.currency.toUpperCase()} • {localeInfo.country}
                    </div>
                  </div>
                </div>
                {locale === localeInfo.code && (
                  <Check size={16} className="text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  )
} 