import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';

export const securityHeaders: Record<string, string> = {
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com; style-src 'self' 'unsafe-inline'; connect-src 'self' ws: wss: https://lzgynywojluwdccqkeop.supabase.co https://api.stripe.com; img-src 'self' data: blob: https:; font-src 'self' data:; frame-src 'self' https://js.stripe.com;",
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Frame-Options': 'DENY',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin'
};

/**
 * Wraps a Next.js API handler with common security headers.
 */
export function withSecurityHeaders(handler: NextApiHandler): NextApiHandler {
  return (req: NextApiRequest, res: NextApiResponse) => {
    Object.entries(securityHeaders).forEach(([key, value]) => {
      res.setHeader(key, value);
    });
    return handler(req, res);
  };
}
