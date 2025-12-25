'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'

interface VendorSubscription {
  subscription_status: string
  current_period_end: string
  [key: string]: unknown
}

export function SubscriptionManager() {
  const [loading, setLoading] = useState(true)
  const [subscription, setSubscription] = useState<VendorSubscription | null>(null)

  useEffect(() => {
    fetchSubscription()
  }, [])

  const fetchSubscription = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
        setLoading(false)
        return
    }

    // Get profile id first
    const { data: profile } = await supabase.from('profiles').select('id').eq('auth_user_id', user.id).single()
    if (!profile) {
        setLoading(false)
        return
    }

    const { data } = await supabase
      .from('vendor_subscriptions')
      .select('*')
      .eq('provider_id', profile.id)
      .single()
      
    setSubscription(data)
    setLoading(false)
  }

  const handleSubscribe = async () => {
    try {
      const priceId = process.env.NEXT_PUBLIC_STRIPE_PRICE_ID;
      if (!priceId) {
          alert('Configuration error: Missing Price ID');
          return;
      }

      const res = await fetch('/api/billing/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priceId, 
          successUrl: window.location.href,
          cancelUrl: window.location.href,
        }),
      })
      
      if (!res.ok) throw new Error('Failed to create session');
      
      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error(err)
      alert('Failed to start subscription process');
    }
  }

  const handleManage = async () => {
    try {
      const res = await fetch('/api/billing/portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          returnUrl: window.location.href,
        }),
      })
      
      if (!res.ok) throw new Error('Failed to create portal session');

      const { url } = await res.json()
      if (url) window.location.href = url
    } catch (err) {
      console.error(err)
      alert('Failed to open billing portal');
    }
  }

  if (loading) return <div>Loading subscription status...</div>

  const isActive = subscription?.subscription_status === 'active' || subscription?.subscription_status === 'trialing'

  if (!isActive) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div>
                <h3 className="text-lg font-bold text-yellow-900">Activate Booking System</h3>
                <p className="text-yellow-700 mt-1">
                    Subscribe to the Vendor plan to enable bookings and manage your schedule.
                </p>
            </div>
            <Button onClick={handleSubscribe} className="whitespace-nowrap">
                Subscribe Now
            </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
            <h3 className="text-lg font-bold text-gray-900">Subscription Active</h3>
            <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center rounded-full bg-green-50 px-2 py-1 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20">
                    {subscription.subscription_status}
                </span>
                <span className="text-sm text-gray-500">
                    Renews on {new Date(subscription.current_period_end).toLocaleDateString()}
                </span>
            </div>
        </div>
        <Button onClick={handleManage} variant="outline" className="whitespace-nowrap">
            Manage Subscription
        </Button>
      </div>
    </div>
  )
}


