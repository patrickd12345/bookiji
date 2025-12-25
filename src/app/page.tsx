'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { ADSENSE_APPROVAL_MODE } from "@/lib/adsense"
import HomePageWrapper from './HomePageWrapper'
import MaintenanceWrapper from './MaintenanceWrapper'

/**
 * Home Page - Publicly accessible with visible CTAs
 * 
 * Removed secret key gate - home page is now publicly accessible.
 * Maintenance mode can still be enabled via environment variable if needed.
 */
function PageContent() {
  const searchParams = useSearchParams()
  const [hasAccess, setHasAccess] = useState(true) // Default to true - public access
  const [isChecking, setIsChecking] = useState(false) // No checking needed
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // Check if user is admin (admin bypass during maintenance)
    const checkAdmin = async () => {
      try {
        const response = await fetch('/api/auth/check-admin', {
          method: 'GET',
          credentials: 'include'
        })
        if (response.ok) {
          const { isAdmin: adminStatus } = await response.json()
          setIsAdmin(adminStatus)
          if (adminStatus) {
            // Admins always have access, even during maintenance
            setHasAccess(true)
            setIsChecking(false)
            return
          }
        }
      } catch (error) {
        console.warn('Failed to check admin status:', error)
      }
    }

    checkAdmin()

    // Check if maintenance mode is explicitly enabled via env var
    const maintenanceMode = process.env.NEXT_PUBLIC_MAINTENANCE_MODE === 'true'
    
    if (maintenanceMode && !ADSENSE_APPROVAL_MODE && !isAdmin) {
      // Only show maintenance if explicitly enabled, not in AdSense approval mode, and not admin
      setHasAccess(false)
    } else {
      // Public access or admin - show home page
      setHasAccess(true)
    }
    
    setIsChecking(false)
  }, [])

  // Show real site (public access)
  if (hasAccess) {
    return <HomePageWrapper />
  }

  return <MaintenanceWrapper />
}

export default function Page() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
      </div>
    }>
      <PageContent />
    </Suspense>
  )
}
