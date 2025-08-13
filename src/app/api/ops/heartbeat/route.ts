import { NextResponse } from 'next/server';
import { checkDlqAndAlert } from '@/lib/observability/dlqMonitor';

export async function GET() {
  await checkDlqAndAlert();
  return NextResponse.json({ ok: true });
}
