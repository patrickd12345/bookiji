import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();
    const metrics = orchestrator.getMetrics();
    const uptime = orchestrator.getUptime();

    return NextResponse.json({
      success: true,
      data: {
        state,
        metrics,
        uptime,
        isRunning: orchestrator.isRunning(),
      }
    });
  } catch (error) {
    console.error('SimCity status error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get simulation status' 
    }, { status: 500 });
  }
}


