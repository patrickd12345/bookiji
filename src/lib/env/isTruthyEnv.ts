/**
 * Check if an environment variable value is truthy
 * 
 * Returns true for:
 * - 'true' (case-insensitive)
 * - '1'
 * - 'yes' (case-insensitive)
 * - 'on' (case-insensitive)
 * 
 * Returns false for:
 * - undefined
 * - null
 * - empty string
 * - 'false', '0', 'no', 'off' (case-insensitive)
 * - any other value
 */
export function isTruthyEnv(value: string | undefined | null): boolean {
  if (!value) {
    return false
  }
  
  const normalized = value.toLowerCase().trim()
  
  return normalized === 'true' || 
         normalized === '1' || 
         normalized === 'yes' || 
         normalized === 'on'
}
