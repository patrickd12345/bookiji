import { NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function POST() {
  try {
    const orchestrator = getOrchestrator();
    
    if (orchestrator.isRunning()) {
      return NextResponse.json({ 
        success: false,
        error: 'Simulation is already running' 
      }, { status: 400 });
    }

    await orchestrator.start();

    return NextResponse.json({
      success: true,
      message: 'Simulation started successfully',
      data: {
        isRunning: orchestrator.isRunning(),
        startTime: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('SimCity start error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to start simulation' 
    }, { status: 500 });
  }
}



