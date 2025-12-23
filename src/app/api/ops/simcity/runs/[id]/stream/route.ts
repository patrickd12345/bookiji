import { NextRequest } from 'next/server'
import { supabaseAdmin as supabase } from '@/lib/supabaseProxies'

export const dynamic = 'force-dynamic'

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: runId } = await context.params

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()

      const send = (event: string, data: any) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      // Initial ping
      send('ping', { time: new Date().toISOString() })

      // Subscribe to changes in simcity_run_live for this run
      const liveSubscription = supabase
        .channel(`simcity-run-live-${runId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'simcity_run_live',
            filter: `run_id=eq.${runId}`,
          },
          (payload) => {
            const data = payload.new as any
            send('heartbeat', {
              run_id: data.run_id,
              last_event_index: data.last_event_index,
              last_metrics: data.last_metrics,
              status: data.status,
              message: data.last_message,
            })

            if (data.status === 'FAILED' || data.status === 'PASSED' || data.status === 'STOPPED') {
              send('end', { status: data.status })
            }
          }
        )
        .subscribe()

      // Subscribe to new events
      const eventSubscription = supabase
        .channel(`simcity-run-events-${runId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'simcity_run_events',
            filter: `run_id=eq.${runId}`,
          },
          (payload) => {
            const data = payload.new as any
            send('event', {
              event_index: data.event_index,
              event_type: data.event_type,
              event_payload: data.event_payload,
            })
          }
        )
        .subscribe()

      // Subscribe to new snapshots
      const snapshotSubscription = supabase
        .channel(`simcity-run-snapshots-${runId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'simcity_run_snapshots',
            filter: `run_id=eq.${runId}`,
          },
          (payload) => {
            const data = payload.new as any
            send('snapshot', {
              event_index: data.event_index,
              metrics: data.metrics,
            })
          }
        )
        .subscribe()

      // Keepalive ping
      const pingInterval = setInterval(() => {
        send('ping', { time: new Date().toISOString() })
      }, 10000)

      request.signal.addEventListener('abort', () => {
        clearInterval(pingInterval)
        supabase.removeChannel(liveSubscription)
        supabase.removeChannel(eventSubscription)
        supabase.removeChannel(snapshotSubscription)
        controller.close()
      })
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}




