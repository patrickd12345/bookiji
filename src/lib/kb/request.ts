import { headers } from 'next/headers';
import { randomUUID } from 'crypto';

export function getRequestId() {
  return randomUUID();
}

export async function requireApiKey(expected: string | undefined) {
  const h = await headers();
  const key = h.get('x-api-key');
  if (!expected || !key || key !== expected) return false;
  return true;
}

export function withCommonHeaders(res: Response, extra: Record<string,string> = {}) {
  const base: Record<string,string> = {
    'Content-Type': 'application/json; charset=utf-8',
    'X-Request-Id': getRequestId(),
    ...extra
  };
  const merged = new Headers(res.headers);
  Object.entries(base).forEach(([k,v]) => merged.set(k, v));
  return new Response(res.body, { status: res.status, headers: merged });
}
