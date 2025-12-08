import { useEffect, useState } from 'react'
import type { ControlPlaneEvent } from '../../../../src/app/api/ops/controlplane/_lib/types'
import { openEventStream } from '../services/eventStreamClient'

export function useEventStream() {
  const [events, setEvents] = useState<ControlPlaneEvent[]>([])
  const [status, setStatus] = useState<'connecting' | 'open' | 'closed'>('connecting')

  useEffect(() => {
    const source = openEventStream(
      (event) => setEvents((prev) => [...prev.slice(-99), event]),
      (streamStatus) => setStatus(streamStatus === 'open' ? 'open' : 'closed')
    )
    return () => source.close()
  }, [])

  return { events, status }
}
