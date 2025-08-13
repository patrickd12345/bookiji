import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabaseServerClient';

export async function POST(req: NextRequest) {
  const { token } = await req.json().catch(() => ({ token: null }));
  if (!token) {
    return NextResponse.json({ ok: false, error: 'token required' }, { status: 400 });
  }
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: token, type: 'email' });
  if (error) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 400 });
  }
  return NextResponse.json({ ok: true });
}
