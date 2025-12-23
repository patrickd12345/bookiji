'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"
import HomePageWrapper from './HomePageWrapper'
import MaintenanceWrapper from './MaintenanceWrapper'

/**
 * Coming Soon Page with Secret Key Access
 * 
 * By default, shows the coming soon page in production.
 * Access the real site using: ?key=YOUR_SECRET_KEY
 * The key is stored in BOOKIJI_SECRET_KEY environment variable.
 * 
 * Once accessed with the key, a cookie is set so you don't need to use it again.
 */
export default function Page() {
  const searchParams = useSearchParams()
  const [hasAccess, setHasAccess] = useState(false)
  const [isChecking, setIsChecking] = useState(true)

  useEffect(() => {
    const checkAccess = async () => {
      // Always show real site in development
      if (process.env.NODE_ENV !== 'production') {
        setHasAccess(true)
        setIsChecking(false)
        return
      }

      // Always show real site in AdSense approval mode
      if (ADSENSE_APPROVAL_MODE) {
        setHasAccess(true)
        setIsChecking(false)
        return
      }

      // Check cookie for previous access
      const hasCookie = typeof document !== 'undefined' && 
        document.cookie.includes('bookiji_access=true')

      if (hasCookie) {
        setHasAccess(true)
        setIsChecking(false)
        return
      }

      // Check for secret key in URL
      const keyParam = searchParams?.get('key')
      if (keyParam) {
        try {
          const response = await fetch('/api/validate-access', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key: keyParam }),
          })

          if (response.ok) {
            const { valid } = await response.json()
            if (valid) {
              setHasAccess(true)
              // Remove key from URL
              window.history.replaceState({}, '', window.location.pathname)
            } else {
              setHasAccess(false)
            }
          } else {
            setHasAccess(false)
          }
        } catch (error) {
          console.error('Error validating access:', error)
          setHasAccess(false)
        }
      } else {
        setHasAccess(false)
      }

      setIsChecking(false)
    }

    checkAccess()
  }, [searchParams])

  // Show loading state briefly while checking
  if (isChecking) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    )
  }

  // Show real site if access granted, otherwise show coming soon
  if (hasAccess) {
    return <HomePageWrapper />
  }

  return <MaintenanceWrapper />
}
