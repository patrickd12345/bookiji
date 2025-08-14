'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../../hooks/useAuth'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function ChooseRolePage() {
  const [selectedRoles, setSelectedRoles] = useState<string[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user, isAuthenticated } = useAuth()
  const router = useRouter()

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to choose your role
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => router.push('/login')}
              className="w-full"
            >
              Go to Login
            </Button>
          </CardContent>
        </Card>
      </div>
    )
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
    } catch (error) {
      console.error('Error updating roles:', error)
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
