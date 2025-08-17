import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

export function withMeta(body: any, timings?: Record<string, number>) {
  const res = NextResponse.json(body);
  const rid = randomUUID();
  res.headers.set('X-Request-ID', rid);
  
  if (timings) {
    const serverTiming = Object.entries(timings)
      .map(([k, v]) => `${k};dur=${Math.max(0, Math.round(v))}`)
      .join(', ');
    res.headers.set('Server-Timing', serverTiming);
  }
  
  return res;
}

export function withRequestId(body: any) {
  const res = NextResponse.json(body);
  const rid = randomUUID();
  res.headers.set('X-Request-ID', rid);
  return res;
}

export function addTimingHeader(response: NextResponse, name: string, duration: number) {
  const existing = response.headers.get('Server-Timing');
  const newTiming = `${name};dur=${Math.max(0, Math.round(duration))}`;
  
  if (existing) {
    response.headers.set('Server-Timing', `${existing}, ${newTiming}`);
  } else {
    response.headers.set('Server-Timing', newTiming);
  }
  
  return response;
}
