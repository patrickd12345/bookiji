import { NextResponse } from 'next/server'

export async function GET() {
	const body = 'pong'
	return new NextResponse(body, {
		status: 200,
		headers: {
			'Content-Type': 'text/plain',
			'Content-Length': Buffer.byteLength(body).toString()
		}
	})
}


