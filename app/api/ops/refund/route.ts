// NOTE: Skeleton Next.js 15 route handlers with a consistent envelope
import { NextResponse } from 'next/server';

export async function POST() {
  // TODO: RBAC check server-side; reuse domain services (no bypass)
  return NextResponse.json({ ok: true, data: { refunded: true } });
}
