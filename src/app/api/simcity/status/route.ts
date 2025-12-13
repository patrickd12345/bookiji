import { NextResponse } from 'next/server';
import { isRunning } from '@/simcity/daemon';
import { getRates } from '@/simcity/rates';
import { now } from '@/simcity/clock';

export async function GET() {
  return NextResponse.json({
    running: isRunning(),
    rates: getRates(),
    time: now()
  });
}
