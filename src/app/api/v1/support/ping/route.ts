export async function GET() {
	const body = 'pong'
	return new Response(body, {
		status: 200,
		headers: {
			'Content-Type': 'text/plain',
			'Content-Length': Buffer.byteLength(body).toString(),
			'Connection': 'close'
		}
	})
}


