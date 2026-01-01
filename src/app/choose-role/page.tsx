'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthReady } from '@/hooks/useAuthReady'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import Loading from './loading'

export default function ChooseRolePage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  const { ready, session } = useAuthReady()
  const router = useRouter()

  // Check if user is admin
  useEffect(() => {
    if (!ready || !session) return
    
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
            // Auto-redirect admins to admin dashboard
            router.push('/admin')
            return
          }
        }
      } catch (_error) {
        // Error checking admin status - continue
      } finally {
        setCheckingAdmin(false)
      }
    }
    
    checkAdmin()
  }, [ready, session, router])

  useEffect(() => {
    if (!ready) return
    if (!session) {
      router.replace('/login?next=/choose-role')
    }
  }, [ready, session, router])

  if (!ready || checkingAdmin) return <Loading />

  if (!session) {
    return <Loading />
  }

  // If admin, show loading while redirecting
  if (isAdmin) {
    return <Loading />
  }

  const handleRoleToggle = (role: string) => {
    setSelectedRoles(prev => 
      prev.includes(role) 
        ? prev.filter(r => r !== role)
        : [...prev, role]
    )
  }

  const handleSubmit = async () => {
    if (selectedRoles.length === 0) return
    
    setIsSubmitting(true)
    
    try {
      // First, upsert the user profile with roles
      const profileResponse = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          roles: selectedRoles,
          onboarding_completed: true 
        }),
      })

      if (!profileResponse.ok) {
        throw new Error('Failed to update profile')
      }

      // Update user roles in the profiles table
      const rolesResponse = await fetch('/api/user/roles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ roles: selectedRoles }),
      })

      if (rolesResponse.ok) {
        // Redirect based on selected roles
        if (selectedRoles.includes('provider') && selectedRoles.includes('customer')) {
          router.push('/customer/dashboard')
        } else if (selectedRoles.includes('provider')) {
          router.push('/vendor/onboarding')
        } else {
          router.push('/customer/dashboard')
        }
      } else {
        throw new Error('Failed to update roles')
      }
    } catch (_error) {
      // Error updating roles
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose Your Role</CardTitle>
          <CardDescription>
            Select how you want to use Bookiji
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="customer"
                checked={selectedRoles.includes('customer')}
                onChange={() => handleRoleToggle('customer')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="customer" className="text-sm font-medium text-gray-700">
                Customer
              </label>
            </div>
            
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="provider"
                checked={selectedRoles.includes('provider')}
                onChange={() => handleRoleToggle('provider')}
                className="h-4 w-4 text-blue-600 rounded border-gray-300"
              />
              <label htmlFor="provider" className="text-sm font-medium text-gray-700">
                Service Provider
              </label>
            </div>
          </div>
          
          <div className="pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500 mb-2">
              Need admin access? Contact support or check if your email is in the admin allow-list.
            </p>
            <Button
              variant="outline"
              onClick={() => router.push('/admin')}
              className="w-full text-sm"
            >
              Try Admin Dashboard
            </Button>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={selectedRoles.length === 0 || isSubmitting}
            className="w-full"
          >
            {isSubmitting ? 'Setting up...' : 'Continue'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
