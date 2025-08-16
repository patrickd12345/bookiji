import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSupabaseConfig } from '@/config/supabase';

export async function POST() {
	const { url, secretKey } = getSupabaseConfig() as { url: string; secretKey: string };
	const admin = createClient(url, secretKey, { auth: { persistSession:false }, global: { fetch: fetch.bind(globalThis) } });
	const { data, error } = await admin.from('kb_suggestions').insert({
		question: 'Test question',
		answer: 'Test answer',
		status: 'pending'
	}).select('id');
	if (error) return NextResponse.json({ ok:false, error: error.message }, { status: 500 });
	return NextResponse.json({ ok:true, data });
}
