'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SubscriptionManager } from '@/components/SubscriptionManager'

interface Subscription {
  id: string
  subscription_status: string
  plan_type: string
  billing_cycle: string
  current_period_start: string
  current_period_end: string
  trial_start: string | null
  trial_end: string | null
  cancel_at_period_end: boolean
}

interface Plan {
  id: string
  name: string
  description: string
  plan_type: string
  billing_cycle: string
  price_cents: number
  trial_days: number
  features: Record<string, unknown>
}

export default function VendorSubscriptionPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<Subscription | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlan, setSelectedPlan] = useState<string>('')

  useEffect(() => {
    fetchSubscriptionStatus()
  }, [])

  const fetchSubscriptionStatus = async () => {
    try {
      const response = await fetch('/api/vendor/subscription/status')
      const data = await response.json()

      if (response.ok) {
        setSubscription(data.subscription)
        setPlans(data.plans || [])
      }
    } catch (error) {
      console.error('Error fetching subscription:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubscribe = async (planId: string, billingCycle: 'monthly' | 'annual') => {
    try {
      setLoading(true)
      const response = await fetch('/api/vendor/subscription/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ planId, billingCycle })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create subscription')
      }

      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl
      }
    } catch (error) {
      console.error('Error creating subscription:', error)
      alert(error instanceof Error ? error.message : 'Failed to create subscription')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = async (cancelAtPeriodEnd: boolean = true) => {
    if (!confirm(`Are you sure you want to ${cancelAtPeriodEnd ? 'schedule cancellation' : 'cancel immediately'}?`)) {
      return
    }

    try {
      setLoading(true)
      const response = await fetch('/api/vendor/subscription/cancel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cancelAtPeriodEnd })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to cancel subscription')
      }

      alert(data.message || 'Subscription cancelled successfully')
      fetchSubscriptionStatus()
    } catch (error) {
      console.error('Error cancelling subscription:', error)
      alert(error instanceof Error ? error.message : 'Failed to cancel subscription')
    } finally {
      setLoading(false)
    }
  }

  if (loading && !subscription) {
    return <div className="container mx-auto py-8">Loading subscription status...</div>
  }

  const isActive = subscription && (
    subscription.subscription_status === 'active' ||
    subscription.subscription_status === 'trialing' ||
    (subscription.trial_end && new Date(subscription.trial_end) > new Date())
  )

  return (
    <div className="container mx-auto py-8 max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Subscription Management</CardTitle>
          <CardDescription>
            Manage your Bookiji Scheduling subscription
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SubscriptionManager />
        </CardContent>
      </Card>

      {isActive && subscription && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Current Subscription</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-semibold">Plan: {subscription.plan_type || 'Unknown'}</p>
                <p className="text-sm text-muted-foreground">
                  Billing: {subscription.billing_cycle || 'monthly'}
                </p>
                {subscription.trial_end && new Date(subscription.trial_end) > new Date() && (
                  <p className="text-sm text-blue-600">
                    Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}
                  </p>
                )}
                {subscription.current_period_end && (
                  <p className="text-sm text-muted-foreground">
                    Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
                  </p>
                )}
              </div>
              <Badge variant={subscription.subscription_status === 'active' ? 'default' : 'secondary'}>
                {subscription.subscription_status}
              </Badge>
            </div>

            {subscription.cancel_at_period_end && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-sm text-yellow-800">
                  Your subscription will be cancelled at the end of the current billing period.
                </p>
              </div>
            )}

            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => router.push('/api/billing/portal')}
              >
                Manage Billing
              </Button>
              {!subscription.cancel_at_period_end && (
                <Button
                  variant="destructive"
                  onClick={() => handleCancel(true)}
                >
                  Cancel at Period End
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {!isActive && (
        <Card>
          <CardHeader>
            <CardTitle>Available Plans</CardTitle>
            <CardDescription>
              Choose a plan that fits your business needs
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <Card key={plan.id} className="relative">
                  <CardHeader>
                    <CardTitle>{plan.name}</CardTitle>
                    <CardDescription>{plan.description}</CardDescription>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">
                        ${(plan.price_cents / 100).toFixed(2)}
                      </span>
                      <span className="text-muted-foreground">/{plan.billing_cycle === 'annual' ? 'year' : 'month'}</span>
                    </div>
                    {plan.trial_days > 0 && (
                      <Badge variant="secondary" className="mt-2">
                        {plan.trial_days}-day free trial
                      </Badge>
                    )}
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2 text-sm mb-4">
                      {plan.features && Object.entries(plan.features).map(([key, value]) => (
                        <li key={key} className="flex items-center">
                          <span className="mr-2">✓</span>
                          <span>{key}: {String(value)}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      className="w-full"
                      onClick={() => handleSubscribe(plan.id, plan.billing_cycle as 'monthly' | 'annual')}
                      disabled={loading}
                    >
                      {plan.price_cents === 0 ? 'Get Started' : 'Subscribe'}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
