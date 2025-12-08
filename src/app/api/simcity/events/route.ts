import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { getSimEngine } from '@/lib/simcity/engine';
import { publishEvent } from '@/lib/simcity/events';
import { SimCityEvent, SimEventPayload } from '@/lib/simcity/types';

export async function GET(request: NextRequest) {
  const orchestrator = getOrchestrator();
  const engine = getSimEngine();

  // Set up SSE headers
  const response = new NextResponse(
    engine.getEventStream(request.signal),
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

  // Bridge legacy orchestrator events into the live bus
  const orchestratorHandler = (payload: SimEventPayload) => {
    const event: SimCityEvent = {
      type: 'scenario',
      timestamp: payload.timestamp,
      data: payload,
    };
    publishEvent(event);
  };

  orchestrator.on('event', orchestratorHandler);
  request.signal.addEventListener('abort', () => orchestrator.off('event', orchestratorHandler));

  return response;
}
