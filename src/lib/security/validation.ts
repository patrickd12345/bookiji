import { z } from 'zod';

export function validate<T>(schema: z.Schema<T>, data: unknown): T {
  return schema.parse(data);
}
