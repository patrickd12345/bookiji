'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

function VerifyPageContent() {
  const [verificationStatus, setVerificationStatus] = useState<'verifying' | 'verified' | 'failed' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  useEffect(() => {
    if (!token) {
      setVerificationStatus('failed')
      setError('No verification token provided')
      return
    }

    verifyToken(token)
  }, [token])

  const verifyToken = async (verificationToken: string) => {
    try {
      setVerificationStatus('verifying')
      
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: verificationToken }),
      })

      const responseData = await response.json()

      if (response.ok && responseData.success) {
        setVerificationStatus('verified')
        // Store verification success in localStorage for session management
        localStorage.setItem('emailVerified', 'true')
      } else {
        setVerificationStatus('failed')
        setError(responseData.error || responseData.message || 'Verification failed')
      }
    } catch {
      setVerificationStatus('failed')
      setError('Network error occurred during verification')
    }
  }

  if (verificationStatus === 'verifying') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Verifying Email</CardTitle>
            <CardDescription>
              Please wait while we verify your email address...
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationStatus === 'verified') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-green-600">Email Verified!</CardTitle>
            <CardDescription>
              Your email has been successfully verified. You can now log in to your account.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">
                Continue to Login
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (verificationStatus === 'failed') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-red-600">Verification Failed</CardTitle>
            <CardDescription>
              {error || 'Unable to verify your email address. The link may be expired or invalid.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button asChild className="w-full">
              <Link href="/login">
                Return to Login
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full">
              <Link href="/register">
                Create New Account
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Email Verification</CardTitle>
          <CardDescription>
            Processing verification request...
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Loading...</CardTitle>
            <CardDescription>
              Please wait while we load the verification page...
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  )
}
