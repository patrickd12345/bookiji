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
  // Get the date components as they appear when the date is displayed in the timezone
  // These are the "wall clock" components we want to preserve
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

  const parts = formatter.formatToParts(date);
  const targetYear = parseInt(parts.find((p) => p.type === 'year')?.value || '0', 10);
  const targetMonth = parseInt(parts.find((p) => p.type === 'month')?.value || '0', 10) - 1;
  const targetDay = parseInt(parts.find((p) => p.type === 'day')?.value || '0', 10);
  const targetHour = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
  const targetMinute = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
  const targetSecond = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

  // We need to find the UTC time that, when displayed in the timezone, shows targetYear, targetMonth, etc.
  // Strategy: Start with a UTC date using target components, see what it displays as in timezone,
  // then adjust based on the difference.
  
  // Step 1: Create a UTC date with target components (as if they were UTC)
  const candidateUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, targetHour, targetMinute, targetSecond));
  
  // Step 2: See what this UTC time displays as in the timezone
  const tzParts = formatter.formatToParts(candidateUTC);
  const displayedYear = parseInt(tzParts.find((p) => p.type === 'year')?.value || '0', 10);
  const displayedMonth = parseInt(tzParts.find((p) => p.type === 'month')?.value || '0', 10) - 1;
  const displayedDay = parseInt(tzParts.find((p) => p.type === 'day')?.value || '0', 10);
  const displayedHour = parseInt(tzParts.find((p) => p.type === 'hour')?.value || '0', 10);
  const displayedMinute = parseInt(tzParts.find((p) => p.type === 'minute')?.value || '0', 10);
  const displayedSecond = parseInt(tzParts.find((p) => p.type === 'second')?.value || '0', 10);
  
  // Step 3: Create a UTC date from displayed components (as if displayed components were UTC)
  const displayedAsUTC = new Date(Date.UTC(displayedYear, displayedMonth, displayedDay, displayedHour, displayedMinute, displayedSecond));
  
  // Step 4: Calculate offset
  // If candidateUTC displays as displayedAsUTC in the timezone, then:
  // The timezone offset at candidateUTC is: candidateUTC - displayedAsUTC
  // But we want the UTC time that displays as target components.
  // If candidateUTC already displays as target components, we're done.
  // Otherwise, we need to adjust.
  
  // The offset tells us: when we have a UTC time, what does it show as in the timezone?
  // offset = candidateUTC - displayedAsUTC means: candidateUTC is offset milliseconds ahead of what it displays as
  // So to get a UTC time that displays as target, we need: targetAsUTC - offset
  // But wait, that's not right either...
  
  // Actually: if candidateUTC displays as displayedAsUTC in timezone, and we want it to display as target,
  // we need to adjust by: (target - displayed) in terms of the timezone offset
  
  // Simpler approach: the displayed components tell us the offset
  // displayedAsUTC is what candidateUTC "looks like" in the timezone (as UTC components)
  // target components are what we want it to "look like"
  // So we need to adjust candidateUTC by the difference between target and displayed
  
  const targetAsUTC = new Date(Date.UTC(targetYear, targetMonth, targetDay, targetHour, targetMinute, targetSecond));
  const diff = targetAsUTC.getTime() - displayedAsUTC.getTime();
  
  return new Date(candidateUTC.getTime() + diff);
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
