const ALLOWED_ORIGINS = [
  'https://chat.openai.com',
  'https://api.openai.com',
  // add mobile/webapp origins if needed
];

export function buildCorsHeaders(origin: string | null, allowMethods: string) {
  const headers: Record<string,string> = {
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'Content-Type, X-API-Key',
    'Access-Control-Allow-Methods': allowMethods,
    'Access-Control-Max-Age': '600'
  };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

export function preflightResponse(origin: string | null, allowMethods: string) {
  return new Response(null, { status: 204, headers: buildCorsHeaders(origin, allowMethods) });
}
