'use client'

import { useEffect, useState } from 'react'

type AdminSettings = {
  rag_frequency_threshold: number
  rag_auto_detect_enabled: boolean
}

export default function AdminParametersPage() {
  const [settings, setSettings] = useState<AdminSettings>({ rag_frequency_threshold: 3, rag_auto_detect_enabled: true })
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    ;(async () => {
      try {
        const r = await fetch('/api/admin/settings')
        if (!r.ok) return
        const j = await r.json()
        if (j?.settings) setSettings(j.settings)
      } catch {}
    })()
  }, [])

  const persist = async () => {
    setSaving(true)
    try {
      await fetch('/api/admin/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(settings) })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="text-2xl font-semibold">Admin Parameters</h1>
      <div className="space-y-4">
        <label className="flex items-center gap-3">
          <input type="checkbox" checked={settings.rag_auto_detect_enabled} onChange={e => setSettings(s => ({ ...s, rag_auto_detect_enabled: e.target.checked }))} />
          <span>Enable Auto RAG Detection</span>
        </label>
        <div>
          <label className="block text-sm text-gray-600 mb-1">Frequency threshold (1–10)</label>
          <input type="number" min={1} max={10} value={settings.rag_frequency_threshold}
            onChange={e => setSettings(s => ({ ...s, rag_frequency_threshold: Number(e.target.value) }))}
            className="border rounded px-2 py-1 w-24" />
        </div>
        <button onClick={persist} disabled={saving} className="px-3 py-2 bg-blue-600 text-white rounded disabled:opacity-50">
          {saving ? 'Saving…' : 'Save Settings'}
        </button>
      </div>
    </div>
  )
}


