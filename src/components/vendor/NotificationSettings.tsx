'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

interface NotificationPreferences {
  email: {
    new_booking: boolean
    booking_confirmed: boolean
    booking_cancelled: boolean
    customer_message: boolean
    payment_received: boolean
  }
  sms: {
    new_booking: boolean
    booking_confirmed: boolean
    booking_cancelled: boolean
    customer_message: boolean
    payment_received: boolean
  }
  push: {
    new_booking: boolean
    booking_confirmed: boolean
    booking_cancelled: boolean
    customer_message: boolean
  }
}

export default function NotificationSettings() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<NotificationPreferences>({
    email: {
      new_booking: true,
      booking_confirmed: true,
      booking_cancelled: true,
      customer_message: true,
      payment_received: true
    },
    sms: {
      new_booking: false,
      booking_confirmed: false,
      booking_cancelled: true,
      customer_message: false,
      payment_received: false
    },
    push: {
      new_booking: true,
      booking_confirmed: true,
      booking_cancelled: true,
      customer_message: true
    }
  })

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const response = await fetch('/api/vendor/notifications')
      const data = await response.json()

      if (response.ok && data.preferences) {
        setPreferences(data.preferences)
      }
    } catch (error) {
      console.error('Error fetching preferences:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/vendor/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ preferences })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to save preferences')
      }

      alert('Notification preferences saved!')
    } catch (error) {
      console.error('Error saving preferences:', error)
      alert(error instanceof Error ? error.message : 'Failed to save preferences')
    } finally {
      setSaving(false)
    }
  }

  const updatePreference = (
    channel: 'email' | 'sms' | 'push',
    key: string,
    value: boolean
  ) => {
    setPreferences(prev => ({
      ...prev,
      [channel]: {
        ...prev[channel],
        [key]: value
      }
    }))
  }

  if (loading) {
    return <div>Loading notification preferences...</div>
  }

  const notificationTypes = [
    { key: 'new_booking', label: 'New Booking Request' },
    { key: 'booking_confirmed', label: 'Booking Confirmed' },
    { key: 'booking_cancelled', label: 'Booking Cancelled' },
    { key: 'customer_message', label: 'Customer Message' },
    { key: 'payment_received', label: 'Payment Received' }
  ]

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification Preferences</CardTitle>
        <CardDescription>
          Choose how you want to be notified about booking events
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Email Notifications */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <Label htmlFor={`email-${type.key}`} className="flex-1">
                  {type.label}
                </Label>
                <Switch
                  id={`email-${type.key}`}
                  checked={preferences.email[type.key as keyof typeof preferences.email] || false}
                  onCheckedChange={(checked) => updatePreference('email', type.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* SMS Notifications */}
        <div>
          <h3 className="text-lg font-semibold mb-4">SMS Notifications</h3>
          <div className="space-y-3">
            {notificationTypes.map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <Label htmlFor={`sms-${type.key}`} className="flex-1">
                  {type.label}
                </Label>
                <Switch
                  id={`sms-${type.key}`}
                  checked={preferences.sms[type.key as keyof typeof preferences.sms] || false}
                  onCheckedChange={(checked) => updatePreference('sms', type.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Push Notifications */}
        <div>
          <h3 className="text-lg font-semibold mb-4">Push Notifications</h3>
          <div className="space-y-3">
            {notificationTypes.filter(t => t.key !== 'payment_received').map((type) => (
              <div key={type.key} className="flex items-center justify-between">
                <Label htmlFor={`push-${type.key}`} className="flex-1">
                  {type.label}
                </Label>
                <Switch
                  id={`push-${type.key}`}
                  checked={preferences.push[type.key as keyof typeof preferences.push] || false}
                  onCheckedChange={(checked) => updatePreference('push', type.key, checked)}
                />
              </div>
            ))}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          {saving ? 'Saving...' : 'Save Preferences'}
        </Button>
      </CardContent>
    </Card>
  )
}
