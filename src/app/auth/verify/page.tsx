'use client'
import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function VerifyPage() {
  const params = useSearchParams()
  const token = params?.get('token')
  const [status, setStatus] = useState<'loading'|'ok'|'fail'>('loading')
  const [msg, setMsg] = useState('Verifying…')

  useEffect(() => {
    async function run() {
      if (!token) { setStatus('fail'); setMsg('Missing token'); return }
      try {
        const r = await fetch('/api/auth/verify', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ token }) })
        const j = await r.json().catch(() => ({}))
        if (r.ok && j.ok !== false) { setStatus('ok'); setMsg('Email verified. You can sign in now.') }
        else { setStatus('fail'); setMsg(j.error || 'Verification failed') }
      } catch {
        setStatus('fail'); setMsg('Verification failed')
      }
    }
    run()
  }, [token])

  return (
    <div className="p-6 space-y-2">
      <h1 className="text-xl font-semibold">Verify your email</h1>
      <p>{msg}</p>
      {status !== 'loading' && <Link href="/login" className="text-blue-600 underline">Go to login</Link>}
    </div>
  )
}
