/**
 * Teamwork.com Summary API
 * 
 * Generate AI-powered summaries of Teamwork.com projects, tasks, and milestones.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createTeamworkClient } from '@/lib/integrations/teamwork/client';
import { TeamworkChatGPTBridge } from '@/lib/integrations/teamwork/chatgpt-bridge';

export async function POST(request: NextRequest) {
  try {
    // Check if Teamwork is configured
    if (!process.env.TEAMWORK_API_KEY || !process.env.TEAMWORK_SUBDOMAIN) {
      return NextResponse.json(
        {
          error: 'Teamwork.com is not configured. Please set TEAMWORK_API_KEY and TEAMWORK_SUBDOMAIN environment variables.',
        },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));

    // Create clients
    const teamworkClient = createTeamworkClient();
    const bridge = new TeamworkChatGPTBridge(teamworkClient);

    // Generate summary
    const summary = await bridge.generateSummary({
      projectIds: body.projectIds,
      includeCompleted: body.includeCompleted,
      dateRange: body.dateRange,
    });

    return NextResponse.json({
      success: true,
      summary,
    });
  } catch (error) {
    console.error('Teamwork summary error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
