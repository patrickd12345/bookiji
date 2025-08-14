import { NextResponse } from 'next/server';
import { dlqMonitor } from '@/lib/observability/dlqMonitor';

export async function GET() {
  await dlqMonitor.runCheck();
  return NextResponse.json({ ok: true });
}
