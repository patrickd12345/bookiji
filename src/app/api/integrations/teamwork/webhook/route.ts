/**
 * Teamwork.com Webhook Handler
 * 
 * Receives webhooks from Teamwork.com for real-time updates.
 * Can trigger ChatGPT summaries or notifications when events occur.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    // Verify webhook signature if configured
    const webhookSecret = process.env.TEAMWORK_WEBHOOK_SECRET;
    if (webhookSecret) {
      const _signature = request.headers.get('X-Teamwork-Signature');
      // TODO: Implement signature verification
      // For now, we'll accept all webhooks if secret is set
    }

    const body = await request.json().catch(() => ({}));
    const eventType = body.type || body.event || 'unknown';
    const _eventData = body.data || body;

    // Handle different event types
    switch (eventType) {
      case 'task.created':
      case 'task.updated':
      case 'task.completed':
        // Optionally generate summary or send notification
        // For now, just log
        break;

      case 'milestone.completed':
        // Optionally generate project summary
        break;

      default:
        // Unknown event type
        break;
    }

    return NextResponse.json({
      success: true,
      received: true,
      eventType,
    });
  } catch (error) {
    console.error('Teamwork webhook error:', error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Internal server error',
      },
      { status: 500 }
    );
  }
}
