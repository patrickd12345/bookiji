import { NextResponse } from 'next/server'

const PUBLISHER = process.env.NEXT_PUBLIC_ADSENSE_CLIENT?.replace('ca-pub-', '')

export function GET() {
	const body = PUBLISHER
		? `google.com, pub-${PUBLISHER}, DIRECT, f08c47fec0942fa0\n`
		: `google.com, pub-XXXXXXXXXXXXXXXX, DIRECT, f08c47fec0942fa0\n`
	return new NextResponse(body, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8',
			'Cache-Control': 'public, max-age=86400',
		},
	})
}


