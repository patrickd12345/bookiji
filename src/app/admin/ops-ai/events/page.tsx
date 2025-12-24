'use client'

import { useEffect, useRef, useState } from 'react'
import { Loader2 } from 'lucide-react'

type OpsEvent = {
  id: string
  timestamp: string
  type?: string
  source?: string
  title?: string
  severity?: string
  service?: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: Record<string, any>
}

export default function OpsEventsPage() {
  const [events, setEvents] = useState<OpsEvent[]>([])
  const [connected, setConnected] = useState(false)
  const eventSourceRef = useRef<EventSource | null>(null)

  useEffect(() => {
    const es = new EventSource('/api/ops/events/stream')
    eventSourceRef.current = es

    es.addEventListener('init', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as OpsEvent[]
        setEvents(payload.slice(-200))
        setConnected(true)
      } catch {
        // ignore
      }
    })

    es.addEventListener('message', (event) => {
      try {
        const payload = JSON.parse((event as MessageEvent).data) as OpsEvent
        setEvents((prev) => [...prev, payload].slice(-200))
      } catch {
        // ignore
      }
    })

    es.onerror = () => {
      setConnected(false)
    }

    return () => {
      es.close()
    }
  }, [])

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-slate-50">Live Ops Event Stream</h2>
          <p className="text-slate-400">Read-only tail of recent operational events.</p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-300">
          <span
            className={`h-2 w-2 rounded-full ${connected ? 'bg-emerald-400' : 'bg-slate-600'}`}
          />
          {connected ? 'Live' : 'Connecting…'}
        </div>
      </header>

      {!connected && events.length === 0 ? (
        <div className="flex items-center gap-2 text-slate-300">
          <Loader2 className="h-4 w-4 animate-spin" />
          Waiting for events…
        </div>
      ) : (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-3 space-y-2 max-h-[700px] overflow-y-auto">
          {[...events].reverse().map((e) => (
            <div
              key={e.id}
              className="rounded-md border border-slate-800/80 bg-slate-950/60 p-2 text-sm text-slate-200"
            >
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{e.type || 'event'}</span>
                <span>{e.timestamp}</span>
              </div>
              <p className="text-slate-100 mt-1">{e.title || e.source || 'Unnamed event'}</p>
              {e.severity && <p className="text-xs text-slate-400">Severity: {e.severity}</p>}
              {e.service && <p className="text-xs text-slate-400">Service: {e.service}</p>}
            </div>
          ))}
          {events.length === 0 && <p className="text-slate-500 text-sm">No events yet.</p>}
        </div>
      )}
    </div>
  )
}
