import { NextRequest, NextResponse } from 'next/server'

export async function adminGuard(request: NextRequest) {
	const url = request.nextUrl
	if (!url.pathname.startsWith('/admin')) return NextResponse.next()
	// Simple dev-mode guard using header; production should verify session/JWT
	const isAdminHeader = request.headers.get('x-user-role') === 'admin'
	if (isAdminHeader) return NextResponse.next()
	url.pathname = '/'
	return NextResponse.redirect(url)
}


