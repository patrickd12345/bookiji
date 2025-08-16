import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'

export async function GET(request: Request) {
	try {
		const admin = createSupabaseServerClient()
		// Expecting a cookie-based session or service role context.
		// For simplicity, look up user by a header in dev; in prod use auth middleware.
		const userId = request.headers.get('x-user-id') || ''
		if (!userId) return NextResponse.json({ isAdmin: false }, { status: 200 })
		const { data } = await admin
			.from('profiles')
			.select('id, role')
			.eq('id', userId)
			.single()
		return NextResponse.json({ isAdmin: data?.role === 'admin' }, { status: 200 })
	} catch {
		return NextResponse.json({ isAdmin: false }, { status: 200 })
	}
}


