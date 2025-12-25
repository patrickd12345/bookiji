import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { getSimEngine } from '@/lib/simcity/engine';
import { resolveScenarioOverride } from '@/lib/simcity/scenarios';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { seed, scenario, policies, durationMinutes } = body;

    const orchestrator = getOrchestrator();
    const engine = getSimEngine();

    if (engine.isRunning() || orchestrator.isRunning()) {
      return NextResponse.json({
        success: false,
        error: 'Simulation is already running'
      }, { status: 400 });
    }

    const override = resolveScenarioOverride(scenario);

    engine.start({
      scenario: scenario ?? override.id,
      speed: policies?.speed,
      minutesPerTick: policies?.minutesPerTick,
      baseTickMs: policies?.tickSpeedMs,
      durationMinutes: durationMinutes ?? override.durationMinutes,
    });

    // Start legacy orchestrator for existing dashboards when possible
    try {
      await orchestrator.start({ seed, scenario, policies, durationMinutes: durationMinutes ?? override.durationMinutes });
    } catch (error) {
      console.warn('Legacy orchestrator could not start; continuing with live engine only', error);
    }

    const runInfo = orchestrator.getRunInfo();
    const snapshot = engine.getSnapshot();

    return NextResponse.json({
      success: true,
      message: 'Simulation started successfully',
      data: {
        isRunning: true,
        startTime: snapshot.startedAt ?? new Date(snapshot.time).toISOString(),
        runId: runInfo.runId,
        seed: seed ?? runInfo.seed,
        scenario: snapshot.scenario ?? runInfo.scenario,
        speed: snapshot.speed,
        tick: snapshot.tick,
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

