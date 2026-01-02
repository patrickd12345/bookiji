/**
 * Calendar Sync Normalization Helpers
 * 
 * Pure functions for normalizing calendar intervals to UTC and validating intervals.
 * Used for consistent handling of timezone-aware calendar events during sync.
 */

export interface TimeInterval {
  start: Date;
  end: Date;
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

/**
 * Normalizes busy intervals from a given timezone to UTC.
 * Handles DST transitions correctly.
 * 
 * @param intervals - Array of intervals with start/end dates
 * @param timezone - IANA timezone identifier (e.g., 'America/New_York', 'Europe/London')
 * @returns Array of intervals normalized to UTC
 */
export function normalizeBusyIntervalsToUTC(
  intervals: TimeInterval[],
  timezone: string
): TimeInterval[] {
  if (!intervals || intervals.length === 0) {
    return [];
  }

  return intervals.map((interval) => {
    // Convert start time from timezone to UTC
    const startUTC = convertToUTC(interval.start, timezone);
    
    // Convert end time from timezone to UTC
    const endUTC = convertToUTC(interval.end, timezone);

    return {
      start: startUTC,
      end: endUTC,
    };
  });
}

/**
 * Converts a Date object from a given timezone to UTC.
 * 
 * The input date's components are interpreted as being in the specified timezone.
 * We find the UTC time that, when displayed in that timezone, shows those components.
 * 
 * @param date - Date object (components interpreted as being in source timezone)
 * @param timezone - IANA timezone identifier
 * @returns Date object in UTC
 */
function convertToUTC(date: Date, timezone: string): Date {
  // For UTC inputs, normalization is a no-op: the `Date` already represents
  // an absolute UTC instant and there is no "wall clock" reinterpretation needed.
  if (timezone === 'UTC' || timezone === 'Etc/UTC' || timezone === 'GMT' || timezone === 'Etc/GMT') {
    return new Date(date.getTime());
  }

  // IMPORTANT: input `date` is treated as a "naive wall-clock" time (no timezone).
  // We interpret its *local* components (getFullYear/getHours/etc) as if they occurred
  // in the provided IANA timezone, then return the corresponding UTC instant.
  //
  // This makes tests deterministic across machines with different local timezones.
  const targetYear = date.getFullYear();
  const targetMonth = date.getMonth();
  const targetDay = date.getDate();
  const targetHour = date.getHours();
  const targetMinute = date.getMinutes();
  const targetSecond = date.getSeconds();

  // Strategy: Use Intl.DateTimeFormat to find the UTC time that displays as the target components
  // in the source timezone. We do this by:
  // 1. Create a date string in ISO format with the target components (treating them as UTC)
  // 2. Parse it and see what it displays as in the timezone
  // 3. Calculate the offset and adjust
  
  // Create a UTC date with target components (as if they were UTC)
  const candidateUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, targetHour, targetMinute, targetSecond));
  
  // Format candidateUTC in the source timezone to see what it displays as
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  
  const tzParts = formatter.formatToParts(candidateUTC);
  const displayedYear = parseInt(tzParts.find((p) => p.type === 'year')?.value || '0', 10);
  const displayedMonth = parseInt(tzParts.find((p) => p.type === 'month')?.value || '0', 10) - 1;
  const displayedDay = parseInt(tzParts.find((p) => p.type === 'day')?.value || '0', 10);
  const displayedHour = parseInt(tzParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const displayedMinute = parseInt(tzParts.find((p) => p.type === 'minute')?.value || '0', 10);
  const displayedSecond = parseInt(tzParts.find((p) => p.type === 'second')?.value || '0', 10);
  
  // Calculate the offset: candidateUTC displays as (displayedYear, displayedMonth, ...) in timezone
  // We want it to display as (targetYear, targetMonth, ...) in timezone
  // The offset is the difference between what we want and what we have
  const displayedAsUTC = new Date(Date.UTC(displayedYear, displayedMonth, displayedDay, displayedHour, displayedMinute, displayedSecond));
  const targetAsUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, targetHour, targetMinute, targetSecond));
  
  // The offset is: candidateUTC - displayedAsUTC (what candidateUTC shows as in timezone, in UTC terms)
  // We want: resultUTC such that resultUTC shows as targetAsUTC in timezone
  // So: resultUTC = candidateUTC + (targetAsUTC - displayedAsUTC)
  const offset = targetAsUTC.getTime() - displayedAsUTC.getTime();
  
  return new Date(candidateUTC.getTime() + offset);
}

/**
 * Validates an array of time intervals.
 * Ensures:
 * - end > start for each interval
 * - No NaN values
 * - Intervals are properly ordered (start before end)
 * 
 * @param intervals - Array of intervals to validate
 * @returns Validation result with valid flag and error messages
 */
export function validateIntervals(intervals: TimeInterval[]): ValidationResult {
  const errors: string[] = [];

  if (!Array.isArray(intervals)) {
    return {
      valid: false,
      errors: ['Intervals must be an array'],
    };
  }

  intervals.forEach((interval, index) => {
    if (!interval) {
      errors.push(`Interval at index ${index} is null or undefined`);
      return;
    }

    const { start, end } = interval;

    // Check for NaN
    if (start instanceof Date && isNaN(start.getTime())) {
      errors.push(`Interval at index ${index}: start date is invalid (NaN)`);
    }

    if (end instanceof Date && isNaN(end.getTime())) {
      errors.push(`Interval at index ${index}: end date is invalid (NaN)`);
    }

    // Check that start and end are Date objects
    if (!(start instanceof Date)) {
      errors.push(`Interval at index ${index}: start must be a Date object`);
    }

    if (!(end instanceof Date)) {
      errors.push(`Interval at index ${index}: end must be a Date object`);
    }

    // Check that end > start
    if (start instanceof Date && end instanceof Date && !isNaN(start.getTime()) && !isNaN(end.getTime())) {
      if (end.getTime() <= start.getTime()) {
        errors.push(
          `Interval at index ${index}: end time (${end.toISOString()}) must be after start time (${start.toISOString()})`
        );
      }
    }
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Sorts intervals by start time (ascending).
 * 
 * @param intervals - Array of intervals to sort
 * @returns Sorted array of intervals
 */
export function sortIntervalsByStart(intervals: TimeInterval[]): TimeInterval[] {
  return [...intervals].sort((a, b) => a.start.getTime() - b.start.getTime());
}
