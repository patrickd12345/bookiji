'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle2, ArrowRight, Calendar, BookOpen, Settings, Zap } from 'lucide-react'

export default function VendorOnboardingCompletePage() {
  const router = useRouter()
  const [hasSubscription, setHasSubscription] = useState(false)

  useEffect(() => {
    checkSubscription()
  }, [])

  const checkSubscription = async () => {
    try {
      const response = await fetch('/api/vendor/subscription/status')
      const data = await response.json()
      setHasSubscription(data.isActive || false)
    } catch (error) {
      console.error('Error checking subscription:', error)
    }
  }

  return (
    <div className="container mx-auto py-12 max-w-4xl">
      <div className="text-center mb-8">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome to Bookiji Scheduling!
        </h1>
        <p className="text-lg text-gray-600">
          Your vendor profile is set up. Let&apos;s get you started.
        </p>
      </div>

      {!hasSubscription && (
        <Card className="mb-8 border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-blue-900">Activate Your Booking System</CardTitle>
            <CardDescription className="text-blue-700">
              Subscribe to start creating bookings and managing your schedule
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4">
              <Link href="/vendor/dashboard/subscription" className="flex-1">
                <Button className="w-full bg-gradient-to-r from-blue-600 to-purple-600">
                  Choose Subscription Plan
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/vendor/dashboard">
                <Button variant="outline">
                  Skip for Now
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                1
              </span>
              <div>
                <p className="font-medium">Set Up Your Services</p>
                <p className="text-sm text-gray-600">Add services you offer with pricing and duration</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                2
              </span>
              <div>
                <p className="font-medium">Create Availability</p>
                <p className="text-sm text-gray-600">Set your available time slots for customers to book</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold">
                3
              </span>
              <div>
                <p className="font-medium">Start Creating Bookings</p>
                <p className="text-sm text-gray-600">Create bookings for customers instantly—no payment required</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-purple-600" />
              Key Features
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">Payment-free vendor booking creation</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">Zero double bookings guaranteed</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">Scheduling certification system</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              <span className="text-sm">Real-time booking management</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/vendor/dashboard">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <BookOpen className="h-5 w-5" />
                Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                View bookings, manage schedule, and track performance
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/bookings/create">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Calendar className="h-5 w-5" />
                Create Booking
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Create a booking for a customer instantly
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/vendor/settings">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer h-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Settings className="h-5 w-5" />
                Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Configure your business profile and preferences
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="mt-8 text-center">
        <Button
          onClick={() => router.push('/vendor/dashboard')}
          size="lg"
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          Go to Dashboard
          <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
