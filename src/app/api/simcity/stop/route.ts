import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function POST() {
  try {
    const orchestrator = getOrchestrator();
    
    if (!orchestrator.isRunning()) {
      return NextResponse.json({ 
        success: false,
        error: 'Simulation is not running' 
      }, { status: 400 });
    }

    await orchestrator.stop();

    return NextResponse.json({
      success: true,
      message: 'Simulation stopped successfully',
      data: {
        isRunning: orchestrator.isRunning(),
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


