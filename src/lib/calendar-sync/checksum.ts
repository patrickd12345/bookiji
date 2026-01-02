/**
 * Calendar Sync Checksum Helpers
 * 
 * Deterministic checksum computation for external calendar events.
 * Used to detect changes in events during sync operations.
 */

import { createHash } from 'crypto';

export interface EventChecksumParams {
  external_event_id: string;
  start: Date;
  end: Date;
  is_busy: boolean;
  provider_id: string;
  calendar_provider: string;
}

/**
 * Computes a deterministic checksum for an external calendar event.
 * 
 * The checksum is computed from:
 * - external_event_id
 * - start time (ISO string, normalized to UTC)
 * - end time (ISO string, normalized to UTC)
 * - is_busy flag
 * - provider_id
 * - calendar_provider
 * 
 * Same inputs will always produce the same checksum.
 * Any change to inputs will produce a different checksum.
 * 
 * @param params - Event parameters
 * @returns SHA-256 hash as hexadecimal string
 */
export function computeExternalEventChecksum(
  params: EventChecksumParams
): string {
  const {
    external_event_id,
    start,
    end,
    is_busy,
    provider_id,
    calendar_provider,
  } = params;

  // Normalize dates to ISO strings (UTC)
  const startISO = start.toISOString();
  const endISO = end.toISOString();

  // Create a deterministic string representation
  // Order matters for consistency
  const dataString = [
    external_event_id,
    startISO,
    endISO,
    is_busy.toString(),
    provider_id,
    calendar_provider,
  ].join('|');

  // Compute SHA-256 hash
  const hash = createHash('sha256');
  hash.update(dataString, 'utf8');
  return hash.digest('hex');
}

/**
 * Validates checksum parameters.
 * 
 * @param params - Event parameters to validate
 * @returns Object with valid flag and error message if invalid
 */
export function validateChecksumParams(
  params: EventChecksumParams
): { valid: boolean; error?: string } {
  if (!params.external_event_id || typeof params.external_event_id !== 'string') {
    return {
      valid: false,
      error: 'external_event_id is required and must be a string',
    };
  }

  if (!(params.start instanceof Date) || isNaN(params.start.getTime())) {
    return {
      valid: false,
      error: 'start must be a valid Date object',
    };
  }

  if (!(params.end instanceof Date) || isNaN(params.end.getTime())) {
    return {
      valid: false,
      error: 'end must be a valid Date object',
    };
  }

  if (params.end.getTime() <= params.start.getTime()) {
    return {
      valid: false,
      error: 'end time must be after start time',
    };
  }

  if (typeof params.is_busy !== 'boolean') {
    return {
      valid: false,
      error: 'is_busy must be a boolean',
    };
  }

  if (!params.provider_id || typeof params.provider_id !== 'string') {
    return {
      valid: false,
      error: 'provider_id is required and must be a string',
    };
  }

  if (!params.calendar_provider || typeof params.calendar_provider !== 'string') {
    return {
      valid: false,
      error: 'calendar_provider is required and must be a string',
    };
  }

  const validProviders = ['google', 'microsoft'];
  if (!validProviders.includes(params.calendar_provider)) {
    return {
      valid: false,
      error: `calendar_provider must be one of: ${validProviders.join(', ')}`,
    };
  }

  return { valid: true };
}

import type { TimeInterval } from './normalize';

/**
 * Computes a deterministic checksum for a set of time intervals.
 * - Inputs assumed normalized to UTC.
 * - Order-independent: same intervals in different order => same checksum.
 * - Returns SHA-256 hex string.
 */
export function computeIntervalSetChecksum(intervals: TimeInterval[]): string {
  // Empty set -> stable hash
  if (!Array.isArray(intervals) || intervals.length === 0) {
    return createHash('sha256').update('empty', 'utf8').digest('hex');
  }

  const tuples: [number, number][] = intervals.map((i) => [i.start.getTime(), i.end.getTime()]);
  tuples.sort((a, b) => (a[0] === b[0] ? a[1] - b[1] : a[0] - b[0]));

  const payload = tuples.map(([s, e]) => `${s}-${e}`).join('|');
  return createHash('sha256').update(payload, 'utf8').digest('hex');
}
