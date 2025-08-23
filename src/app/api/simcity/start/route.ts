import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seed, scenario, policies } = body;
    
    const orchestrator = getOrchestrator();
    
    if (orchestrator.isRunning()) {
      return NextResponse.json({ 
        success: false,
        error: 'Simulation is already running' 
      }, { status: 400 });
    }

    await orchestrator.start({ seed, scenario, policies });

    const runInfo = orchestrator.getRunInfo();

    return NextResponse.json({
      success: true,
      message: 'Simulation started successfully',
      data: {
        isRunning: orchestrator.isRunning(),
        startTime: new Date().toISOString(),
        runId: runInfo.runId,
        seed: runInfo.seed,
        scenario: runInfo.scenario
      }
    });
  } catch (error) {
    console.error('SimCity start error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start simulation',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

