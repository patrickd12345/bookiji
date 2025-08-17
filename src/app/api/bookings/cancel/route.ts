import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  console.warn('Deprecated cancel endpoint hit');
  return NextResponse.json(
    {
      error: 'CANCELLATION_DISABLED',
      message:
        'In-app cancellation is not available. Call the other party using the phone number on the confirmation.',
    },
    { status: 410 }
  );
}

