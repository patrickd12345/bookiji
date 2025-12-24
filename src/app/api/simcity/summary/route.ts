import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { getSimEngine } from '@/lib/simcity/engine';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const _runId = searchParams.get('runId');
    
    const orchestrator = getOrchestrator();
    const engine = getSimEngine();
    
    if (!orchestrator.isRunning()) {
      return NextResponse.json({ 
        success: false,
        error: 'Simulation is not running' 
      }, { status: 400 });
    }

    const runInfo = orchestrator.getRunInfo();
    const metrics = orchestrator.getMetrics();
    const violations = orchestrator.getViolations();
    const uptime = orchestrator.getUptime();
    const state = orchestrator.getState();
    const engineSnapshot = engine.getSnapshot();

    // Check invariants if not already done
    if (violations.length === 0) {
      await orchestrator.checkInvariants();
    }

    const summary = {
      runInfo,
      scenario: runInfo.scenario,
      metrics,
      violations,
      uptime,
      state: {
        tick: state.tick,
        simulatedTime: state.nowISO,
        liveAgents: state.liveAgents,
        policies: state.policies,
        runInfo,
        scenario: runInfo.scenario,
        liveEngine: engineSnapshot,
      },
      timestamp: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('SimCity summary error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to get simulation summary',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
