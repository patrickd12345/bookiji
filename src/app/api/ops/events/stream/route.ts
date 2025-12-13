import { NextResponse } from 'next/server'
import { loadEvents } from '@/scripts/ops-events-store'

export const runtime = 'nodejs'

export async function GET(request: Request) {
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
