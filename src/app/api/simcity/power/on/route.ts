import { NextResponse } from 'next/server';
import { isRunning, powerOn } from '@/simcity/daemon';

export async function POST() {
  if (!isRunning()) {
    powerOn().catch((err) => {
      // eslint-disable-next-line no-console
      console.error('[simcity] failed to power on', err);
    });
  }

  return NextResponse.json({ running: true });
}
