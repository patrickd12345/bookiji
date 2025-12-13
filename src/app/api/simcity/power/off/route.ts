import { NextResponse } from 'next/server';
import { isRunning, powerOff } from '@/simcity/daemon';

export async function POST() {
  powerOff();
  return NextResponse.json({ running: isRunning() });
}
