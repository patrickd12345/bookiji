import { NextResponse } from 'next/server';
import { getDeadLetterQueueSize } from '@/lib/services/notificationQueue';
import '@/app/api/_utils/observability';

export async function GET() {
  const size = getDeadLetterQueueSize();
  return NextResponse.json({ status: 'ok', dlqSize: size });
}
