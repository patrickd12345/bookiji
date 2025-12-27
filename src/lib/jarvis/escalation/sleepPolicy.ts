/**
 * Sleep Policy Model
 * 
 * Static, versioned sleep policies.
 * Deterministic. No user input at runtime.
 */

export interface SleepPolicy {
  id: string
  version: string
  quietHours: {
    start: string // "22:00"
    end: string   // "07:00"
    timezone: string // "America/New_York"
  }
  wakeThresholdSeverity: 'SEV-1' | 'SEV-0' // Only SEV-1+ can wake during quiet hours
  maxSilentMinutes: number // Max time before escalation even in quiet hours
  escalationIntervalsMinutes: number[] // [15, 30, 60, 120] - intervals between escalations
  maxNotificationsPerIncident: number // Hard cap to prevent spam
}

/**
 * Default sleep policy (OWNER_DEFAULT_V1)
 */
export const OWNER_DEFAULT_V1: SleepPolicy = {
  id: 'OWNER_DEFAULT_V1',
  version: '1.0.0',
  quietHours: {
    start: '22:00',
    end: '07:00',
    timezone: process.env.JARVIS_OWNER_TIMEZONE || 'America/New_York'
  },
  wakeThresholdSeverity: 'SEV-1', // Only SEV-1 can wake during quiet hours
  maxSilentMinutes: 120, // 2 hours max silence even in quiet hours for SEV-1
  escalationIntervalsMinutes: [15, 30, 60, 120], // Escalate every 15min, then 30min, etc.
  maxNotificationsPerIncident: 5 // Hard cap: never send more than 5 SMS per incident
}

/**
 * Get active sleep policy
 */
export function getSleepPolicy(): SleepPolicy {
  // For now, only one policy. Can be extended later.
  return OWNER_DEFAULT_V1
}

/**
 * Check if current time is in quiet hours
 */
export function isInQuietHours(policy: SleepPolicy): boolean {
  try {
    const now = new Date()
    const timezone = policy.quietHours.timezone
    
    // Get current time in owner's timezone
    const currentTime = now.toLocaleTimeString('en-US', {
      hour12: false,
      timeZone: timezone
    })
    
    const start = policy.quietHours.start
    const end = policy.quietHours.end
    
    // Handle overnight quiet hours (e.g., 22:00 to 07:00)
    if (start > end) {
      // Overnight: quiet hours span midnight
      return currentTime >= start || currentTime <= end
    } else {
      // Same day: quiet hours within same day
      return currentTime >= start && currentTime <= end
    }
  } catch (error) {
    // If timezone check fails, assume not in quiet hours (fail open)
    console.error('[Jarvis] Error checking quiet hours:', error)
    return false
  }
}

/**
 * Get minutes until quiet hours end
 */
export function minutesUntilQuietHoursEnd(policy: SleepPolicy): number | null {
  if (!isInQuietHours(policy)) {
    return null
  }

  try {
    const now = new Date()
    const timezone = policy.quietHours.timezone
    
    // Parse end time
    const [endHour, endMinute] = policy.quietHours.end.split(':').map(Number)
    
    // Get current time in timezone
    const currentTime = new Date(now.toLocaleString('en-US', { timeZone: timezone }))
    const endTime = new Date(currentTime)
    endTime.setHours(endHour, endMinute, 0, 0)
    
    // If end time is before current time, it's tomorrow
    if (endTime <= currentTime) {
      endTime.setDate(endTime.getDate() + 1)
    }
    
    const diffMs = endTime.getTime() - currentTime.getTime()
    return Math.floor(diffMs / (1000 * 60))
  } catch (error) {
    console.error('[Jarvis] Error calculating quiet hours end:', error)
    return null
  }
}

