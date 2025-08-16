import { NextResponse } from 'next/server'

export async function GET() {
	const payload = {
		status: 'ok',
		uptime: process.uptime ? process.uptime() : 0,
		timestamp: Date.now()
	}
	const body = JSON.stringify(payload)
	return new NextResponse(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(body).toString(),
			'X-Deploy-Touch': 'health-1'
		}
	})
}


