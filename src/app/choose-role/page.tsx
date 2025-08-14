'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function ChooseRolePage() {
  const [roles, setRoles] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const router = useRouter()

  function toggle(role: 'customer'|'provider') {
    setRoles(prev => prev.includes(role) ? prev.filter(r => r !== role) : [...prev, role])
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (roles.length === 0) { setError('Select at least one role'); return }
    setBusy(true)

    const { data: { user }, error: uerr } = await supabase.auth.getUser()
    if (uerr || !user) { setBusy(false); setError('You must be signed in'); return }

    const { error: perr } = await supabase
      .from('profiles')
      .update({ roles })
      .eq('id', user.id)

    setBusy(false)
    if (perr) { setError(perr.message || 'Failed to save roles'); return }

    if (roles.length === 1 && roles[0] === 'provider') router.replace('/vendor/onboarding')
    else router.replace('/customer/dashboard')
  }

  return (
    <form onSubmit={onSubmit} className="p-6 max-w-md mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Choose your role</h1>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={roles.includes('customer')} onChange={() => toggle('customer')} />
        <span>Customer</span>
      </label>
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={roles.includes('provider')} onChange={() => toggle('provider')} />
        <span>Provider</span>
      </label>
      <button disabled={busy} className="px-4 py-2 rounded bg-black text-white">
        {busy ? 'Saving…' : 'Continue'}
      </button>
    </form>
  )
}
