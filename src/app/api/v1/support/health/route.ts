export async function GET() {
	const body = JSON.stringify({ ok: true, status: 'healthy' })
	const length = Buffer.byteLength(body).toString()

	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': length,
			'Connection': 'close',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	})
}


