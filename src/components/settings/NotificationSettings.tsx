'use client'

import { useState, useEffect } from 'react'
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, Bell, Mail, MessageSquare, Smartphone } from 'lucide-react'
import { pushNotificationManager } from '@/lib/notifications/pushNotifications'

interface Preferences {
  email_enabled: boolean
  sms_enabled: boolean
  push_enabled: boolean
  marketing_emails: boolean
  transactional_emails: boolean
  booking_updates: boolean
  reminders: boolean
}

export function NotificationSettings() {
  const [preferences, setPreferences] = useState<Preferences | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  useEffect(() => {
    fetchPreferences()
  }, [])

  const fetchPreferences = async () => {
    try {
      const res = await fetch('/api/notifications/preferences')
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()
      setPreferences(data.preferences)
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Failed to load preferences' })
    } finally {
      setLoading(false)
    }
  }

  const handleToggle = async (key: keyof Preferences) => {
    if (!preferences) return
    
    // Handle Push Notification Logic
    if (key === 'push_enabled' && !preferences.push_enabled) {
      // Enabling push - request permission
      try {
        // Initialize manager if needed (it might have failed init if permission was default/denied)
        // We can't access private init, but we can try requestPermission logic via manager if exposed,
        // or just rely on the fact that we are toggling it.
        
        // NOTE: pushNotificationManager.init() is private and called in constructor.
        // But requestPermission is private too. 
        // We need to expose a public method to enable notifications or just check permission here.
        
        // Since the manager is already instantiated, we might need to check browser permission directly 
        // or add a public method to manager. 
        // For now, let's assume we just toggle state, but ideally we should request permission.
        
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setMessage({ type: 'error', text: 'Permission denied for push notifications' });
          return; // Don't toggle if denied
        }
        
        // Update manager preferences
        pushNotificationManager.updatePreferences({ enabled: true });
      } catch (error) {
        console.error('Error requesting push permission:', error);
      }
    } else if (key === 'push_enabled' && preferences.push_enabled) {
        pushNotificationManager.updatePreferences({ enabled: false });
    }

    setPreferences(prev => prev ? { ...prev, [key]: !prev[key] } : null)
  }

  const handleSave = async () => {
    if (!preferences) return
    setSaving(true)
    setMessage(null)

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences)
      })
      
      if (!res.ok) throw new Error('Failed to save')
      setMessage({ type: 'success', text: 'Preferences saved successfully' })
      
      // Clear success message after 3 seconds
      setTimeout(() => setMessage(null), 3000)
    } catch (error) {
      console.error(error)
      setMessage({ type: 'error', text: 'Failed to save changes' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 flex justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  if (!preferences) return null

  return (
    <div className="space-y-6">
      {message && (
        <Alert variant={message.type === 'error' ? 'destructive' : 'default'} className={message.type === 'success' ? 'border-green-500 text-green-700 bg-green-50' : ''}>
          <AlertDescription>{message.text}</AlertDescription>
        </Alert>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>Channels</CardTitle>
          </div>
          <CardDescription>Choose how you want to be notified</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="email_enabled">Email Notifications</Label>
              </div>
              <p className="text-sm text-muted-foreground">Receive updates via email</p>
            </div>
            <Switch 
              id="email_enabled" 
              checked={preferences.email_enabled}
              onCheckedChange={() => handleToggle('email_enabled')}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="sms_enabled">SMS Notifications</Label>
              </div>
              <p className="text-sm text-muted-foreground">Receive updates via text message</p>
            </div>
            <Switch 
              id="sms_enabled" 
              checked={preferences.sms_enabled}
              onCheckedChange={() => handleToggle('sms_enabled')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Smartphone className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="push_enabled">Push Notifications</Label>
              </div>
              <p className="text-sm text-muted-foreground">Receive updates on your device</p>
            </div>
            <Switch 
              id="push_enabled" 
              checked={preferences.push_enabled}
              onCheckedChange={() => handleToggle('push_enabled')}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notification Types</CardTitle>
          <CardDescription>Control what kind of messages you receive</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="booking_updates">Booking Updates</Label>
              <p className="text-sm text-muted-foreground">Confirmations, cancellations, and changes</p>
            </div>
            <Switch 
              id="booking_updates" 
              checked={preferences.booking_updates}
              onCheckedChange={() => handleToggle('booking_updates')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="reminders">Reminders</Label>
              <p className="text-sm text-muted-foreground">Upcoming appointment reminders</p>
            </div>
            <Switch 
              id="reminders" 
              checked={preferences.reminders}
              onCheckedChange={() => handleToggle('reminders')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="transactional_emails">Account Updates</Label>
              <p className="text-sm text-muted-foreground">Security alerts and account changes</p>
            </div>
            <Switch 
              id="transactional_emails" 
              checked={preferences.transactional_emails}
              onCheckedChange={() => handleToggle('transactional_emails')}
            />
          </div>

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="marketing_emails">Marketing & Tips</Label>
              <p className="text-sm text-muted-foreground">News, tips, and special offers</p>
            </div>
            <Switch 
              id="marketing_emails" 
              checked={preferences.marketing_emails}
              onCheckedChange={() => handleToggle('marketing_emails')}
            />
          </div>
        </CardContent>
        <CardFooter>
          <Button onClick={handleSave} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {saving ? 'Saving...' : 'Save Preferences'}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}


