import { NextRequest, NextResponse } from 'next/server';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { SimPolicies } from '@/lib/simcity/types';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const policies: Partial<SimPolicies> = body.policies;

    if (!policies) {
      return NextResponse.json({ 
        success: false,
        error: 'Policies object is required' 
      }, { status: 400 });
    }

    const orchestrator = getOrchestrator();
    orchestrator.setPolicies(policies);

    return NextResponse.json({
      success: true,
      message: 'Policies updated successfully',
      data: {
        policies: orchestrator.getState().policies,
        timestamp: new Date().toISOString(),
      }
    });
  } catch (error) {
    console.error('SimCity policies update error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Failed to update policies' 
    }, { status: 500 });
  }
}


