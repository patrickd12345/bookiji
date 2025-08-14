'use client'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import Link from 'next/link'

export default function ResetPage() {
  const params = useSearchParams()
  const token = params?.get('token')
  const [pwd, setPwd] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr(null); setBusy(true)
    if (!token) { setBusy(false); setErr('Missing token'); return }
    try {
      const r = await fetch('/api/auth/reset', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token, newPassword: pwd }) })
      const j = await r.json().catch(()=> ({}))
      if (r.ok && j.ok !== false) { setDone(true) }
      else setErr(j.error || 'Reset failed')
    } catch {
      setErr('Reset failed')
    } finally { setBusy(false) }
  }

  if (done) return <div className="p-6 space-y-2"><p>Password updated.</p><Link href="/login" className="text-blue-600 underline">Log in</Link></div>

  return (
    <form onSubmit={onSubmit} className="p-6 max-w-md space-y-3">
      <h1 className="text-xl font-semibold">Set a new password</h1>
      <input className="border rounded p-2 w-full" type="password" value={pwd} onChange={e=>setPwd(e.target.value)} placeholder="New password" minLength={8} required />
      {err && <p className="text-red-600 text-sm">{err}</p>}
      <button disabled={busy} className="rounded px-4 py-2 bg-black text-white">{busy?'Saving…':'Save password'}</button>
    </form>
  )
}
