import { NextResponse } from 'next/server';
import { getRates, updateRates } from '@/simcity/rates';
import { setLoopDelayMs, setTickAdvanceMs } from '@/simcity/cityLoop';
import { isRunning } from '@/simcity/daemon';

type ConfigPayload = {
  rates?: Partial<ReturnType<typeof getRates>>;
  loopDelayMs?: number;
  tickAdvanceMs?: number;
};

export async function POST(request: Request) {
  const body = (await request.json()) as ConfigPayload;

  if (body.rates) {
    updateRates(body.rates);
  }

  if (typeof body.loopDelayMs === 'number') {
    setLoopDelayMs(body.loopDelayMs);
  }

  if (typeof body.tickAdvanceMs === 'number') {
    setTickAdvanceMs(body.tickAdvanceMs);
  }

  return NextResponse.json({
    running: isRunning(),
    rates: getRates(),
    loopDelayMs: typeof body.loopDelayMs === 'number' ? Math.max(0, body.loopDelayMs) : undefined,
    tickAdvanceMs: typeof body.tickAdvanceMs === 'number' ? Math.max(1, body.tickAdvanceMs) : undefined
  });
}
