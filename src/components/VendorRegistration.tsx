'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

type DayHours = { open: boolean; start_time: string; end_time: string }
type VendorFormData = {
  business_name: string
  contact_name: string
  phone: string
  email: string
  description: string
  address: string
  hours: Record<'mon'|'tue'|'wed'|'thu'|'fri'|'sat'|'sun', DayHours>
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
    business_name:'', contact_name:'', phone:'', email:'', description:'', address:'', hours: defaultHours()
  })
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  function set<K extends keyof VendorFormData>(k: K, v: VendorFormData[K]) {
    setData(prev => ({ ...prev, [k]: v }))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!data.business_name || !data.email) { setError('Business name and email are required'); return }
    setBusy(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setBusy(false); setError('Must be signed in'); return }

    const { error: verr } = await supabase.from('vendors').upsert({
      user_id: user.id,
      business_name: data.business_name,
      contact_name: data.contact_name,
      phone: data.phone,
      email: data.email,
      description: data.description,
      address: data.address,
      hours_json: data.hours,
    }, { onConflict: 'user_id' })

    setBusy(false)
    if (verr) { setError(verr.message || 'Failed to save'); return }
    onSuccess?.()
    router.replace('/vendor/dashboard')
  }

  return (
    <form onSubmit={submit} className="p-6 max-w-2xl mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Provider onboarding</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <input className="border p-2 w-full" placeholder="Business name" value={data.business_name} onChange={e=>set('business_name', e.target.value)} />
      <input className="border p-2 w-full" placeholder="Contact name" value={data.contact_name} onChange={e=>set('contact_name', e.target.value)} />
      <input className="border p-2 w-full" placeholder="Phone" value={data.phone} onChange={e=>set('phone', e.target.value)} />
      <input className="border p-2 w-full" placeholder="Email" type="email" value={data.email} onChange={e=>set('email', e.target.value)} />
      <input className="border p-2 w-full" placeholder="Address" value={data.address} onChange={e=>set('address', e.target.value)} />
      <textarea className="border p-2 w-full" placeholder="Description" value={data.description} onChange={e=>set('description', e.target.value)} />
      <button disabled={busy} className="px-4 py-2 rounded bg-black text-white">{busy ? 'Saving…' : 'Finish onboarding'}</button>
    </form>
  )
} 