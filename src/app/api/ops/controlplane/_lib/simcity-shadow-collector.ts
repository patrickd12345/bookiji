/**
 * SimCity Phase 10: Shadow Event Collector
 *
 * Collects production events for shadow simulation.
 * Phase 10 = hook-ready, not connected to production yet.
 */

import type { ShadowEvent } from './simcity-types'

/**
 * Collect shadow events from production within a time window.
 * 
 * Phase 10: Stub implementation - returns empty array.
 * Future: Hook into production event stream.
 * 
 * @param window Time window specification (e.g., "1h", "5m", ISO date range)
 * @returns Array of shadow events from production
 */
export function collectShadowEvents(_window: string): ShadowEvent[] {
  // Phase 10: Stub - not connected to production yet
  // Future implementation will:
  // 1. Parse window parameter (time range or duration)
  // 2. Query production event stream/logs
  // 3. Transform production events to ShadowEvent format
  // 4. Return events for shadow simulation
  
  return []
}

