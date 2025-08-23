import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function GET(request: NextRequest) {
  const orchestrator = getOrchestrator();

  // Set up SSE headers
  const response = new NextResponse(
    new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        
        // Send initial connection message
        controller.enqueue(encoder.encode('data: {"type":"connected","timestamp":"' + new Date().toISOString() + '"}\n\n'));

        // Set up event listener
        const eventHandler = (event: any) => {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        };

        orchestrator.on('event', eventHandler);

        // Keep connection alive
        const keepAlive = setInterval(() => {
          controller.enqueue(encoder.encode('data: {"type":"keepalive","timestamp":"' + new Date().toISOString() + '"}\n\n'));
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



