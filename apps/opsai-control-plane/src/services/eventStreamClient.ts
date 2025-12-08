import { opsaiClient } from './opsaiClient'
import type { ControlPlaneEvent } from '../../../../src/app/api/ops/controlplane/_lib/types'

export type EventStreamHandler = (event: ControlPlaneEvent) => void

export function openEventStream(onEvent: EventStreamHandler, onStatus?: (status: 'open' | 'closed') => void) {
  const source = new EventSource(opsaiClient.eventsUrl())

  source.onopen = () => onStatus?.('open')
  source.onerror = () => onStatus?.('closed')

  source.addEventListener('init', (ev) => {
    try {
      const parsed = JSON.parse((ev as MessageEvent).data)
      parsed.forEach((item: ControlPlaneEvent) => onEvent(item))
    } catch {
      // ignore
    }
  })

  source.onmessage = (ev) => {
    try {
      const parsed = JSON.parse(ev.data) as ControlPlaneEvent
      onEvent(parsed)
    } catch {
      // ignore
    }
  }

  return source
}
