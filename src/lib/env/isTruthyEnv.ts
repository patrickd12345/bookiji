/**
 * Check if an environment variable value is truthy
 * 
 * Returns true if the value is:
 * - 'true' (case-insensitive)
 * - '1'
 * - 'yes' (case-insensitive)
 * - Any non-empty string that's not 'false', '0', 'no', or 'off'
 * 
 * Returns false for:
 * - undefined
 * - null
 * - empty string
 * - 'false', '0', 'no', 'off' (case-insensitive)
 */
export function isTruthyEnv(value: string | undefined | null): boolean {
  if (!value) return false
  
  const normalized = value.trim().toLowerCase()
  
  // Explicitly false values
  if (['false', '0', 'no', 'off', ''].includes(normalized)) {
    return false
  }
  
  // Explicitly true values
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true
  }
  
  // Any other non-empty value is considered truthy
  return normalized.length > 0
}
