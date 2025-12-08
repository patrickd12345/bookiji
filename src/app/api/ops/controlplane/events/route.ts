import { NextRequest, NextResponse } from 'next/server'
import { fetchControlPlaneOverview } from '../_lib/overview'
import { loadEvents } from '@/scripts/ops-events-store'
import type { OpsEvent } from '@/types/opsEvents'
import type { ControlPlaneEvent } from '../_lib/types'

export const runtime = 'nodejs'

function mapEvent(event: OpsEvent): ControlPlaneEvent {
  const map: Record<string, ControlPlaneEvent['type']> = {
    deployment: 'deployment_created',
    'deployment_created': 'deployment_created',
    'health-check': 'health_change',
    health_change: 'health_change',
    alert: 'incident_created',
    incident_created: 'incident_created',
    prediction_update: 'prediction_update',
    'user-action': 'control_command',
    control_command: 'control_command'
  }

  const mappedType = map[event.type] || 'prediction_update'
  return {
    id: event.id,
    type: mappedType,
    timestamp: event.timestamp,
    message: event.title,
    data: event.data
  }
}

async function initialEvents(request: NextRequest): Promise<ControlPlaneEvent[]> {
  const stored = loadEvents().slice(-50).map(mapEvent)
  try {
    const overview = await fetchControlPlaneOverview(request)
    stored.unshift({
      id: `${Date.now()}-health`,
      type: 'health_change',
      timestamp: new Date().toISOString(),
      message: `Health: ${overview.health?.overall || 'unknown'}`,
      data: { health: overview.health }
    })
    if (overview.predictions?.healthTrend) {
      stored.unshift({
        id: `${Date.now()}-prediction`,
        type: 'prediction_update',
        timestamp: new Date().toISOString(),
        message: `Health trend ${overview.predictions.healthTrend.trend}`,
        data: { predictions: overview.predictions }
      })
    }
  } catch {
    // ignore and stream stored only
  }
  return stored
}

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder()
  const events = await initialEvents(request)

  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify(events)}\n\n`)
      )

      const ping = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'))
      }, 15000)

      const announce = setInterval(() => {
        const update: ControlPlaneEvent = {
          id: `${Date.now()}-heartbeat`,
          type: 'prediction_update',
          timestamp: new Date().toISOString(),
          message: 'Control plane heartbeat',
          data: {}
        }
        controller.enqueue(
          encoder.encode(`event: update\ndata: ${JSON.stringify(update)}\n\n`)
        )
      }, 45000)

      const close = () => {
        clearInterval(ping)
        clearInterval(announce)
        controller.close()
      }

      setTimeout(close, 5 * 60 * 1000)
    }
  })

  return new NextResponse(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      Connection: 'keep-alive',
      'Cache-Control': 'no-cache, no-transform'
    }
  })
}
