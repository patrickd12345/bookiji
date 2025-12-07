import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, durationMin, parameters } = body;
    
    if (!type) {
      return NextResponse.json({ 
        success: false,
        error: 'Event type is required' 
      }, { status: 400 });
    }
    
    const orchestrator = getOrchestrator();
    
    if (!orchestrator.isRunning()) {
      return NextResponse.json({ 
        success: false,
        error: 'Simulation is not running' 
      }, { status: 400 });
    }

    // Trigger the event by calling the orchestrator directly
    // We'll use the existing event emission system
    orchestrator.emitSimEvent('manual_event', {
      type,
      durationMin,
      parameters,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: `Event ${type} triggered successfully`,
      data: {
        event: {
          type,
          durationMin,
          parameters,
          timestamp: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('SimCity event trigger error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to trigger event',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
