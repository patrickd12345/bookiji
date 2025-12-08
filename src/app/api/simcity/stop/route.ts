import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { getSimEngine } from '@/lib/simcity/engine';

export async function POST() {
  try {
    const orchestrator = getOrchestrator();
    const engine = getSimEngine();

    if (!orchestrator.isRunning() && !engine.isRunning()) {
      return NextResponse.json({
        success: false,
        error: 'Simulation is not running'
      }, { status: 400 });
    }

    if (engine.isRunning()) {
      engine.pause();
      engine.reset();
    }

    if (orchestrator.isRunning()) {
      await orchestrator.stop();
    }

    return NextResponse.json({
      success: true,
      message: 'Simulation stopped successfully',
      data: {
        isRunning: orchestrator.isRunning() || engine.isRunning(),
        stopTime: new Date().toISOString(),
        uptime: orchestrator.getUptime(),
      }
    });
  } catch (error) {
    console.error('SimCity stop error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to stop simulation' 
    }, { status: 500 });
  }
}

