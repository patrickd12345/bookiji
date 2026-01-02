/**
 * Teamwork.com Search API
 * 
 * Search Teamwork.com data and get AI-powered answers.
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
    const question = body.question || body.query || body.search;

    if (!question) {
      return NextResponse.json(
        { error: 'Question, query, or search term is required' },
        { status: 400 }
      );
    }

    // Create clients
    const teamworkClient = createTeamworkClient();
    const bridge = new TeamworkChatGPTBridge(teamworkClient);

    // Search and answer
    const answer = await bridge.searchAndAnswer(question);

    return NextResponse.json({
      success: true,
      question,
      answer,
    });
  } catch (error) {
    console.error('Teamwork search error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
