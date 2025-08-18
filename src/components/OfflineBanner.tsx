"use client"

import { useEffect } from 'react'
import { AlertTriangle, Wifi, RefreshCw } from 'lucide-react'
import { useUIStore } from '@/stores/uiStore'
import { useI18n } from '@/lib/i18n/useI18n'

export function OfflineBanner() {
  const { 
    isOffline, 
    showOfflineBanner, 
    lastFailedRequest,
    setShowOfflineBanner,
    setLastFailedRequest 
  } = useUIStore()
  const { t } = useI18n()

  // Auto-hide banner when back online
  useEffect(() => {
    if (!isOffline && showOfflineBanner) {
      const timer = setTimeout(() => {
        setShowOfflineBanner(false)
        setLastFailedRequest(null)
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [isOffline, showOfflineBanner, setShowOfflineBanner, setLastFailedRequest])

  if (!showOfflineBanner) return null

  const handleRetry = async () => {
    if (lastFailedRequest?.retryFn) {
      try {
        await lastFailedRequest.retryFn()
        setLastFailedRequest(null)
      } catch (error) {
        console.error('Retry failed:', error)
      }
    }
  }

  const handleDismiss = () => {
    setShowOfflineBanner(false)
  }

  return (
    <div 
      className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-lg transform transition-transform duration-300 ease-in-out"
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
    >
      <div className="flex items-center justify-between px-4 py-3 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 flex-1">
          {isOffline ? (
            <AlertTriangle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          ) : (
            <Wifi className="h-5 w-5 flex-shrink-0 text-green-200" aria-hidden="true" />
          )}
          
          <div className="flex-1 min-w-0">
            <p className="font-medium text-sm">
              {isOffline 
                ? t('connectivity.offline.title', 'You are currently offline')
                : t('connectivity.online.title', 'Connection restored!')
              }
            </p>
            <p className="text-xs opacity-90 mt-0.5">
              {isOffline 
                ? t('connectivity.offline.message', 'Some features may not work. Check your internet connection.')
                : t('connectivity.online.message', 'All features are now available.')
              }
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4">
          {lastFailedRequest && !isOffline && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 px-3 py-1 bg-white/20 hover:bg-white/30 rounded text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
              aria-label={t('connectivity.retry', 'Retry failed request')}
            >
              <RefreshCw className="h-3 w-3" aria-hidden="true" />
              {t('connectivity.retry', 'Retry')}
            </button>
          )}
          
          <button
            onClick={handleDismiss}
            className="p-1 hover:bg-white/20 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label={t('connectivity.dismiss', 'Dismiss notification')}
          >
            <span className="text-lg leading-none" aria-hidden="true">×</span>
          </button>
        </div>
      </div>
    </div>
  )
}
