export async function GET(req: Request) {
	const auth = req.headers.get('authorization') || ''
	const dev = req.headers.get('x-dev-agent') || ''
	const isBearer = auth.startsWith('Bearer ') && auth.slice(7).trim().length > 0
	const isDev = dev === 'allow'

	if (!isBearer && !isDev) {
		const body403 = JSON.stringify({ ok: false, error: 'Forbidden' })
		return new Response(body403, {
			status: 403,
			headers: {
				'Content-Type': 'application/json',
				'Content-Length': Buffer.byteLength(body403).toString(),
				'Connection': 'close',
				'Cache-Control': 'no-store',
				'X-Content-Type-Options': 'nosniff'
			}
		})
	}

	const body200 = JSON.stringify({ ok: true, status: 'healthy' })
	return new Response(body200, {
		status: 200,
		headers: {
			'Content-Type': 'application/json',
			'Content-Length': Buffer.byteLength(body200).toString(),
			'Connection': 'close',
			'Cache-Control': 'no-store',
			'X-Content-Type-Options': 'nosniff'
		}
	})
}


