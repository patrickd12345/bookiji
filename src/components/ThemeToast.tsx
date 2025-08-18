"use client"

import { useEffect } from 'react'
import { X, AlertTriangle } from 'lucide-react'
import { useI18n } from '@/lib/i18n/useI18n'

interface ThemeToastProps {
  show: boolean
  onDismiss: () => void
}

export function ThemeToast({ show, onDismiss }: ThemeToastProps) {
  const { t } = useI18n()

  useEffect(() => {
    if (show) {
      // Auto-dismiss after 3 seconds
      const timer = setTimeout(onDismiss, 3000)
      return () => clearTimeout(timer)
    }
  }, [show, onDismiss])

  if (!show) return null

  return (
    <div 
      className="fixed bottom-4 right-4 z-50 bg-orange-100 border border-orange-300 text-orange-800 px-4 py-3 rounded-lg shadow-lg max-w-sm transition-all duration-300 ease-in-out"
      role="alert"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">
            {t('theme.timeout.title', 'Using default theme')}
          </p>
          <p className="text-xs mt-1 opacity-90">
            {t('theme.timeout.message', 'Theme loading took too long, switched to default.')}
          </p>
        </div>
        <button
          onClick={onDismiss}
          className="p-1 hover:bg-orange-200 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-orange-500"
          aria-label={t('theme.timeout.dismiss', 'Dismiss notification')}
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  )
}
