'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabaseBrowserClient } from '@/lib/supabaseClient'
import { SpecialtyTreeSelect } from './SpecialtyTreeSelect'
import { Button } from './ui/button'
import { Card, CardContent, CardHeader, CardTitle } from './ui/card'
import { Badge } from './ui/badge'
import { X } from 'lucide-react'

type DayHours = { open: boolean; start_time: string; end_time: string }
type VendorFormData = {
  business_name: string
  contact_name: string
  phone: string
  email: string
  description: string
  address: string
  hours: Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', DayHours>
  specialties: Array<{ id: string; name: string }>
}

const defaultHours = (): VendorFormData['hours'] => ({
  mon:{open:true,start_time:'09:00',end_time:'17:00'},
  tue:{open:true,start_time:'09:00',end_time:'17:00'},
  wed:{open:true,start_time:'09:00',end_time:'17:00'},
  thu:{open:true,start_time:'09:00',end_time:'17:00'},
  fri:{open:true,start_time:'09:00',end_time:'17:00'},
  sat:{open:false,start_time:'09:00',end_time:'17:00'},
  sun:{open:false,start_time:'09:00',end_time:'17:00'},
})

export default function VendorRegistration({ onSuccess }: { onSuccess?: () => void }) {
  const [data, setData] = useState<VendorFormData>({
    business_name:'', 
    contact_name:'', 
    phone:'', 
    email:'', 
    description:'', 
    address:'', 
    hours: defaultHours(),
    specialties: []
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  function set<K extends keyof VendorFormData>(k: K, v: VendorFormData[K]) {
    setData(prev => ({ ...prev, [k]: v }))
  }

  const addSpecialty = (specialtyId: string, specialtyName: string) => {
    if (!data.specialties.find(s => s.id === specialtyId)) {
      setData(prev => ({
        ...prev,
        specialties: [...prev.specialties, { id: specialtyId, name: specialtyName }]
      }))
    }
  }

  const removeSpecialty = (specialtyId: string) => {
    setData(prev => ({
      ...prev,
      specialties: prev.specialties.filter(s => s.id !== specialtyId)
    }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!data.business_name || !data.email) { 
      setError('Business name and email are required'); 
      return 
    }
    if (data.specialties.length === 0) {
      setError('Please select at least one specialty'); 
      return 
    }
    
    setBusy(true)
    
    const supabase = supabaseBrowserClient()
    if (!supabase) {
      setBusy(false)
      setError('Supabase client not available')
      return
    }
    
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); setError('Must be signed in'); return }

    try {
      // Create vendor profile
      const { error: verr } = await supabase.from('profiles').upsert({
        id: user.id,
        full_name: data.contact_name,
        email: data.email,
        phone: data.phone,
        role: 'vendor',
        business_name: data.business_name,
        business_description: data.description,
        business_address: data.address,
        business_hours: data.hours,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'id' })

      if (verr) throw verr

      // Add vendor specialties
      const specialtyInserts = data.specialties.map(specialty => ({
        app_user_id: user.id,
        specialty_id: specialty.id,
        is_primary: data.specialties.indexOf(specialty) === 0 // First specialty is primary
      }))

      const { error: specialtyError } = await supabase
        .from('vendor_specialties')
        .insert(specialtyInserts)

      if (specialtyError) throw specialtyError

      setBusy(false)
      onSuccess?.()
      router.replace('/vendor/dashboard')
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Failed to save vendor profile')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Provider Onboarding</h1>
        <p className="text-gray-600">Set up your business profile to start accepting bookings</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={submit} className="space-y-6">
        {/* Business Information */}
        <Card>
          <CardHeader>
            <CardTitle>Business Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Business Name *</label>
                <input 
                  className="border p-3 w-full rounded-lg" 
                  placeholder="Your business name" 
                  value={data.business_name} 
                  onChange={e=>set('business_name', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Contact Name *</label>
                <input 
                  className="border p-3 w-full rounded-lg" 
                  placeholder="Your full name" 
                  value={data.contact_name} 
                  onChange={e=>set('contact_name', e.target.value)} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Phone</label>
                <input 
                  className="border p-3 w-full rounded-lg" 
                  placeholder="Phone number" 
                  value={data.phone} 
                  onChange={e=>set('phone', e.target.value)} 
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Email *</label>
                <input 
                  className="border p-3 w-full rounded-lg" 
                  type="email" 
                  placeholder="Email address" 
                  value={data.email} 
                  onChange={e=>set('email', e.target.value)} 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business Address</label>
              <input 
                className="border p-3 w-full rounded-lg" 
                placeholder="Business address" 
                value={data.address} 
                onChange={e=>set('address', e.target.value)} 
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Business Description</label>
              <textarea 
                className="border p-3 w-full rounded-lg" 
                placeholder="Describe your business and services..." 
                rows={3}
                value={data.description} 
                onChange={e=>set('description', e.target.value)} 
              />
            </div>
          </CardContent>
        </Card>

        {/* Specialties Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Service Specialties *</CardTitle>
            <p className="text-sm text-gray-600">Select the services you provide. You can choose multiple specialties.</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <SpecialtyTreeSelect
              value=""
              onChangeAction={addSpecialty}
              placeholder="Search and select specialties..."
              className="w-full"
            />
            
            {data.specialties.length > 0 && (
              <div className="space-y-2">
                <label className="block text-sm font-medium">Selected Specialties:</label>
                <div className="flex flex-wrap gap-2">
                  {data.specialties.map((specialty, index) => (
                    <Badge key={specialty.id} variant="default" className="flex items-center space-x-2">
                      <span>{specialty.name}</span>
                      {index === 0 && <span className="text-xs">(Primary)</span>}
                      <button
                        type="button"
                        onClick={() => removeSpecialty(specialty.id)}
                        className="ml-1 hover:text-red-500"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Business Hours */}
        <Card>
          <CardHeader>
            <CardTitle>Business Hours</CardTitle>
            <p className="text-sm text-gray-600">Set your operating hours for each day</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(data.hours).map(([day, hours]) => (
                <div key={day} className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id={`open-${day}`}
                      checked={hours.open}
                      onChange={(e) => set('hours', {
                        ...data.hours,
                        [day]: { ...hours, open: e.target.checked }
                      })}
                      className="rounded"
                    />
                    <label htmlFor={`open-${day}`} className="text-sm font-medium capitalize">
                      {day === 'mon' ? 'Monday' : 
                       day === 'tue' ? 'Tuesday' : 
                       day === 'wed' ? 'Wednesday' : 
                       day === 'thu' ? 'Thursday' : 
                       day === 'fri' ? 'Friday' : 
                       day === 'sat' ? 'Saturday' : 'Sunday'}
                    </label>
                  </div>
                  
                  {hours.open && (
                    <div className="grid grid-cols-2 gap-2">
                      <input
                        type="time"
                        value={hours.start_time}
                        onChange={(e) => set('hours', {
                          ...data.hours,
                          [day]: { ...hours, start_time: e.target.value }
                        })}
                        className="border p-2 rounded text-sm"
                      />
                      <input
                        type="time"
                        value={hours.end_time}
                        onChange={(e) => set('hours', {
                          ...data.hours,
                          [day]: { ...hours, end_time: e.target.value }
                        })}
                        className="border p-2 rounded text-sm"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button 
            type="submit" 
            disabled={busy} 
            size="lg"
            className="px-8 py-3"
          >
            {busy ? 'Setting up your profile...' : 'Complete Onboarding'}
          </Button>
        </div>
      </form>
    </div>
  )
} 