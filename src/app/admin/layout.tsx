'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AccessDenied } from '@/components/ui/AccessDenied'
import Sidebar from '@/components/admin/Sidebar'
import Navbar from '@/components/admin/Navbar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  // Test mode bypass for E2E tests - check this first
  const isTestMode = typeof window !== 'undefined' && window.localStorage.getItem('testMode') === 'true'

  const checkAuthentication = useCallback(async () => {
    // Skip authentication check in test mode
    if (isTestMode) {
      setIsAuthenticated(true)
      setIsLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/check-admin', { method: 'GET', credentials: 'include' })
      if (!response.ok) throw new Error('Admin check failed')
      const { isAdmin } = await response.json()
      console.log('Admin check result:', { isAdmin, url: window.location.href })
      if (!isAdmin) {
        console.log('Non-admin user - will show access denied message')
        setIsAuthenticated(false)
        return
      }
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Admin check error:', error)
      router.push('/')
    } finally {
      setIsLoading(false)
    }
  }, [router, isTestMode])

  useEffect(() => { checkAuthentication() }, [checkAuthentication])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Verifying admin access</span>
      </div>
    )
  }

  // Test mode bypass for E2E tests
  if (isTestMode) {
    // Allow access in test mode but skip authentication check
    return (
      <div className="min-h-screen bg-gray-50 flex">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Navbar />
          <main className="flex-1 p-6 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return (
      <AccessDenied
        title="Admin Access Required"
        message="You need admin privileges to access this area. This area is restricted to administrators only."
        showHomeButton={true}
        showLoginButton={true}
      />
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Navbar />
        <main className="flex-1 p-6 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  )
}