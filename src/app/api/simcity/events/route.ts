import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { SimEventPayload } from '@/lib/simcity/types';

export async function GET(request: NextRequest) {
  const orchestrator = getOrchestrator();
  const runInfo = orchestrator.getRunInfo();

  // Set up SSE headers
  const response = new NextResponse(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        const connectedPayload: SimEventPayload = {
          type: 'connected',
          timestamp: new Date().toISOString(),
          runId: runInfo.runId,
          scenario: runInfo.scenario,
          data: { message: 'SimCity event stream connected' },
        };
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(connectedPayload)}\n\n`));

        // Set up event listener
        const eventHandler = (event: SimEventPayload) => {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        orchestrator.on('event', eventHandler);

        // Keep connection alive
        const keepAlive = setInterval(() => {
          const keepAlivePayload: SimEventPayload = {
            type: 'keepalive',
            timestamp: new Date().toISOString(),
            runId: orchestrator.getRunInfo().runId,
            scenario: orchestrator.getRunInfo().scenario,
            data: { message: 'SimCity keepalive' },
          };
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(keepAlivePayload)}\n\n`));
        }, 30000); // Every 30 seconds

        // Clean up on disconnect
        request.signal.addEventListener('abort', () => {
          orchestrator.off('event', eventHandler);
          clearInterval(keepAlive);
          controller.close();
        });
      }
    }),
    {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control',
      },
    }
  );

  return response;
}
