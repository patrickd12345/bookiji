"use client"

import { useEffect } from 'react'
import { useUIStore } from '@/stores/uiStore'

export function useOfflineStatus() {
  const { isOffline, setIsOffline, setShowOfflineBanner } = useUIStore()

  useEffect(() => {
    const handleOnline = () => {
      setIsOffline(false)
      setShowOfflineBanner(false)
      console.log('Connection restored')
    }

    const handleOffline = () => {
      setIsOffline(true)
      setShowOfflineBanner(true)
      console.log('Connection lost')
    }

    // Set initial state
    if (typeof navigator !== 'undefined') {
      setIsOffline(!navigator.onLine)
      if (!navigator.onLine) {
        setShowOfflineBanner(true)
      }
    }

    // Listen for connectivity changes
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [setIsOffline, setShowOfflineBanner])

  return { isOffline }
}
