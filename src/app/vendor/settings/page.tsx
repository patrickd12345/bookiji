'use client'

import { useState, useEffect } from 'react'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Building2, Calendar, Bell, Shield, CreditCard } from 'lucide-react'
import Link from 'next/link'
import NotificationSettings from '@/components/vendor/NotificationSettings'

interface VendorProfile {
  id: string
  business_name: string
  business_description: string
  business_address: string
  phone: string
  email: string
  business_hours: Record<string, { open: boolean; start_time: string; end_time: string }>
}

export default function VendorSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<VendorProfile | null>(null)
  const [activeTab, setActiveTab] = useState('business')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    const supabase = supabaseBrowserClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: vendorProfile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('auth_user_id', user.id)
      .eq('role', 'vendor')
      .single()

    if (!error && vendorProfile) {
      setProfile(vendorProfile as VendorProfile)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!profile) return

    setSaving(true)
    const supabase = supabaseBrowserClient()
    if (!supabase) return

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          business_name: profile.business_name,
          business_description: profile.business_description,
          business_address: profile.business_address,
          phone: profile.phone,
          updated_at: new Date().toISOString()
        })
        .eq('auth_user_id', user.id)

      if (error) throw error

      alert('Settings saved successfully!')
    } catch (error) {
      console.error('Error saving settings:', error)
      alert('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="container mx-auto py-8">Loading settings...</div>
  }

  if (!profile) {
    return <div className="container mx-auto py-8">Profile not found</div>
  }

  return (
    <div className="container mx-auto py-4 sm:py-8 max-w-4xl px-4">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage your business profile and preferences</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="business">
            <Building2 className="h-4 w-4 mr-2" />
            Business
          </TabsTrigger>
          <TabsTrigger value="availability">
            <Calendar className="h-4 w-4 mr-2" />
            Availability
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="subscription">
            <CreditCard className="h-4 w-4 mr-2" />
            Subscription
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="business">
          <Card>
            <CardHeader>
              <CardTitle>Business Information</CardTitle>
              <CardDescription>Update your business details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="business_name">Business Name *</Label>
                <Input
                  id="business_name"
                  value={profile.business_name || ''}
                  onChange={(e) => setProfile({ ...profile, business_name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_description">Description</Label>
                <textarea
                  id="business_description"
                  className="w-full min-h-[100px] px-3 py-2 border rounded-md"
                  value={profile.business_description || ''}
                  onChange={(e) => setProfile({ ...profile, business_description: e.target.value })}
                  placeholder="Describe your business..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="business_address">Address</Label>
                <Input
                  id="business_address"
                  value={profile.business_address || ''}
                  onChange={(e) => setProfile({ ...profile, business_address: e.target.value })}
                  placeholder="Business address"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={profile.phone || ''}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    placeholder="Phone number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={profile.email || ''}
                    disabled
                    className="bg-gray-100"
                  />
                  <p className="text-xs text-gray-500">Email cannot be changed here</p>
                </div>
              </div>

              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="availability">
          <Card>
            <CardHeader>
              <CardTitle>Availability Settings</CardTitle>
              <CardDescription>Manage your business hours and availability</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600 mb-4">
                Manage your availability from the{' '}
                <Link href="/vendor/schedule" className="text-blue-600 hover:underline">
                  Schedule page
                </Link>
              </p>
              <Link href="/vendor/schedule">
                <Button variant="outline">Go to Schedule Management</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <NotificationSettings />
        </TabsContent>

        <TabsContent value="subscription">
          <Card>
            <CardHeader>
              <CardTitle>Subscription Management</CardTitle>
              <CardDescription>Manage your subscription and billing</CardDescription>
            </CardHeader>
            <CardContent>
              <Link href="/vendor/dashboard/subscription">
                <Button className="w-full">Manage Subscription</Button>
              </Link>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security Settings</CardTitle>
              <CardDescription>Manage your account security</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">Security settings coming soon.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
