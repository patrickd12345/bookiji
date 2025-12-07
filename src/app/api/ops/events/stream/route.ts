import { NextResponse } from 'next/server'
import { getOpsMode } from '../../_config'
import { simEventToOpsLog } from '../../_simcity/ops-from-simcity'
import { loadEvents } from '@/scripts/ops-events-store'

export const runtime = 'nodejs'

export async function GET(request: Request) {
  if (getOpsMode() === 'simcity') {
    const encoder = new TextEncoder()
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin

    if (!baseUrl) {
      return NextResponse.json(
        { error: 'NEXT_PUBLIC_SITE_URL is required for SimCity mode' },
        { status: 503 }
      )
    }

    const upstream = await fetch(`${baseUrl}/api/simcity/events`, {
      headers: { Accept: 'text/event-stream' },
      cache: 'no-store'
    })

    const reader = upstream.body?.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const stream = new ReadableStream({
      start(controller) {
        // Initial empty init event to set up client
        controller.enqueue(
          encoder.encode(`event: init\ndata: ${JSON.stringify([])}\n\n`)
        )

        const pump = async () => {
          if (!reader) {
            controller.close()
            return
          }
          try {
            while (true) {
              const { done, value } = await reader.read()
              if (done) {
                controller.close()
                return
              }
              buffer += decoder.decode(value, { stream: true })
              const parts = buffer.split('\n\n')
              buffer = parts.pop() || ''

              for (const part of parts) {
                const lines = part.split('\n')
                const dataLine = lines.find((l) => l.trim().startsWith('data:'))
                if (!dataLine) continue
                const payload = dataLine.trim().replace(/^data:\s*/, '')
                try {
                  const event = JSON.parse(payload)
                  const log = simEventToOpsLog(event)
                  const eventForClient = {
                    id: event?.data?.id ?? `${event.timestamp}-${event.type}`,
                    timestamp: event.timestamp,
                    type: event.type || 'simcity',
                    source: 'simcity',
                    title: log?.message ?? (event?.data?.message || event.type),
                    severity:
                      log?.level === 'ERROR'
                        ? 'error'
                        : log?.level === 'WARN'
                        ? 'warning'
                        : 'info',
                    service: event?.data?.service
                  }
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify(eventForClient)}\n\n`)
                  )
                } catch {
                  // ignore malformed event
                }
              }
            }
          } catch {
            controller.close()
          }
        }

        pump()
      },
      cancel() {
        upstream.body?.cancel()
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

  const encoder = new TextEncoder()
  const events = loadEvents().slice(-200)

  const stream = new ReadableStream({
    start(controller) {
      // send initial batch
      controller.enqueue(
        encoder.encode(`event: init\ndata: ${JSON.stringify(events)}\n\n`)
      )

      const interval = setInterval(() => {
        controller.enqueue(encoder.encode('event: ping\ndata: {}\n\n'))
      }, 15000)

      const close = () => {
        clearInterval(interval)
        controller.close()
      }

      // close after 5 minutes to avoid leaks
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
