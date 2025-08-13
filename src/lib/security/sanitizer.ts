/**
 * Very small utility to strip angle brackets to help prevent XSS in text inputs.
 */
export function sanitize(input: string): string {
  return input.replace(/[<>]/g, '');
}
