import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function GET() {
  try {
    const orchestrator = getOrchestrator();
    const state = orchestrator.getState();
    const metrics = orchestrator.getMetrics();
    const uptime = orchestrator.getUptime();
    const runInfo = orchestrator.getRunInfo();

    return NextResponse.json({
      success: true,
      data: {
        state: { ...state, metrics },
        metrics,
        policies: state.policies,
        runInfo,
        scenario: runInfo.scenario,
        uptime,
        isRunning: state.running,
        timestamp: new Date().toISOString(),
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
