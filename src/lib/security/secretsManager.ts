/**
 * Retrieves secrets from environment variables ensuring they exist.
 */
export function getSecret(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing secret: ${key}`);
  }
  return value;
}
