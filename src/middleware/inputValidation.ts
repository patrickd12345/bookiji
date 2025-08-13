import type { NextApiHandler, NextApiRequest, NextApiResponse } from 'next';
import type { ZodSchema } from 'zod';

/**
 * Wraps a handler with Zod-based input validation for req.body.
 */
export function withValidation<T>(schema: ZodSchema<T>, handler: NextApiHandler): NextApiHandler {
  return (req: NextApiRequest, res: NextApiResponse) => {
    try {
      if (req.body) {
        schema.parse(req.body);
      }
      return handler(req, res);
    } catch (err) {
      res.status(400).json({ error: 'Invalid input' });
    }
  };
}
