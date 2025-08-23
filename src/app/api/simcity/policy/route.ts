import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { policies } = body;
    
    if (!policies || typeof policies !== 'object') {
      return NextResponse.json({ 
        success: false,
        error: 'Invalid policies object' 
      }, { status: 400 });
    }
    
    const orchestrator = getOrchestrator();
    
    if (!orchestrator.isRunning()) {
      return NextResponse.json({ 
        success: false,
        error: 'Simulation is not running' 
      }, { status: 400 });
    }

    // Update policies
    orchestrator.setPolicies(policies);

    const currentState = orchestrator.getState();

    return NextResponse.json({
      success: true,
      message: 'Policies updated successfully',
      data: {
        policies: currentState.policies,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('SimCity policy update error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update policies',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
