import { createHash } from 'crypto';

/**
 * Generate a deterministic ICS UID for outbound calendar events.
 * Format: bookiji-{hash}@bookiji.app
 *
 * Deterministic: hash of booking_id|provider_id|calendar_provider
 * Collision handling: append short stable suffix if collision detected by caller
 */
export function generateIcsUid(booking_id: string, provider_id: string, calendar_provider: string): string {
  const base = `${booking_id}|${provider_id}|${calendar_provider}`;
  const hash = createHash('sha256').update(base, 'utf8').digest('hex').slice(0, 24); // 24 hex chars = 96 bits
  return `bookiji-${hash}@bookiji.app`;
}

/**
 * Stable suffix generator for deterministic collision resolution.
 * Caller can append '-' + suffix if needed.
 */
export function generateIcsUidSuffix(booking_id: string, provider_id: string, calendar_provider: string): string {
  const base = `${booking_id}|${provider_id}|${calendar_provider}|suffix`;
  return createHash('sha256').update(base, 'utf8').digest('hex').slice(0, 8);
}

