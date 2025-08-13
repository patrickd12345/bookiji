'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  const checkAuthentication = useCallback(async () => {
    try {
      // SECURE: Real admin authentication check
      console.log('Checking admin authentication')
      
      // Get current user from Supabase auth
      const response = await fetch('/api/auth/check-admin', {
        method: 'GET',
        credentials: 'include'
      })
      
      if (!response.ok) {
        throw new Error('Admin check failed')
      }
      
      const { isAdmin } = await response.json()
      console.log('Admin check result:', isAdmin)
      
      if (!isAdmin) {
        router.push('/login?redirect=/admin/dashboard')
        return
      }
      
      setIsAuthenticated(true)
    } catch (error) {
      console.error('Authentication check failed:', error)
      router.push('/login?redirect=/admin/dashboard')
    } finally {
      setIsLoading(false)
    }
  }, [router])

  useEffect(() => {
    checkAuthentication()
  }, [checkAuthentication])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full"></div>
        <span className="ml-3 text-gray-600">Verifying admin access</span>
      </div>
    )
  }

  // Skip auth check during AdSense approval
  if (!isAuthenticated && process.env.NEXT_PUBLIC_ADSENSE_APPROVAL_MODE !== 'true') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-sm text-gray-500">You don&apos;t have permission to access this area.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {children}
    </div>
  )
} 