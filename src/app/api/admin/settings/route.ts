import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET() {
	const admin = createSupabaseServerClient()
	const { data } = await admin.from('admin_settings').select('*').limit(1).maybeSingle()
	return NextResponse.json({ settings: data || { rag_frequency_threshold: 3, rag_auto_detect_enabled: true } })
}

export async function POST(request: Request) {
	const admin = createSupabaseServerClient()
	const body = await request.json()
	const payload = {
		rag_frequency_threshold: Number(body?.rag_frequency_threshold ?? 3),
		rag_auto_detect_enabled: Boolean(body?.rag_auto_detect_enabled ?? true)
	}
	await admin.from('admin_settings').upsert(payload).select('*').maybeSingle()
	return NextResponse.json({ ok: true })
}


