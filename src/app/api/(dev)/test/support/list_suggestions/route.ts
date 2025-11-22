import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

export async function GET(req: Request) {
	const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
	const admin = createClient(url, secretKey, { auth: { persistSession:false }, global: { fetch: fetch.bind(globalThis) } });
	const u = new URL(req.url);
	const ticket = u.searchParams.get('ticket');
	const status = u.searchParams.get('status');
	let q = admin.from('kb_suggestions').select('*').order('created_at', { ascending: false }).limit(50);
	if (ticket) q = q.eq('ticket_id', ticket);
	if (status) q = q.eq('status', status);
	const { data, error } = await q;
	if (error) return NextResponse.json({ error: error.message }, { status: 500 });
	return NextResponse.json({ suggestions: data });
}
