"use client"

import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

export function useThemeWithTimeout(timeoutMs = 3000) {
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [isLoading, setIsLoading] = useState(true)
  const [hasTimedOut, setHasTimedOut] = useState(false)
  const [showTimeoutToast, setShowTimeoutToast] = useState(false)

  useEffect(() => {
    // Start timeout
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Theme loading timed out, applying default theme')
        setTheme('corporate')
        setHasTimedOut(true)
        setShowTimeoutToast(true)
        setIsLoading(false)
        
        // Auto-hide toast after 3 seconds
        setTimeout(() => setShowTimeoutToast(false), 3000)
      }
    }, timeoutMs)

    // Check if theme is already resolved
    if (resolvedTheme) {
      setIsLoading(false)
      clearTimeout(timeout)
    }

    return () => clearTimeout(timeout)
  }, [resolvedTheme, isLoading, timeoutMs, setTheme])

  // Listen for theme resolution
  useEffect(() => {
    if (resolvedTheme && isLoading) {
      setIsLoading(false)
    }
  }, [resolvedTheme, isLoading])

  return {
    theme,
    resolvedTheme,
    setTheme,
    isLoading,
    hasTimedOut,
    showTimeoutToast,
    dismissToast: () => setShowTimeoutToast(false)
  }
}
