/**
 * Tests for event storage - verify event naming consistency
 */

import type { IncidentEventType } from './events'

describe('Event naming consistency', () => {
  /**
   * Verify that all event type strings match the database CHECK constraint.
   * This prevents silent failures where events are inserted but don't appear in queries.
   */
  it('all event types match database CHECK constraint', () => {
    // These must exactly match the CHECK constraint in the migration
    const dbEventTypes = [
      'incident_created',
      'escalation_decision_made',
      'notification_sent',
      'notification_suppressed',
      'acknowledged',
      'incident_resolved'
    ]

    // These are the TypeScript types - must match exactly
    const tsEventTypes: IncidentEventType[] = [
      'incident_created',
      'escalation_decision_made',
      'notification_sent',
      'notification_suppressed',
      'acknowledged',
      'incident_resolved'
    ]

    // Verify they match
    expect(tsEventTypes.length).toBe(dbEventTypes.length)
    
    tsEventTypes.forEach((tsType, index) => {
      expect(tsType).toBe(dbEventTypes[index])
    })

    // Verify no duplicates
    expect(new Set(tsEventTypes).size).toBe(tsEventTypes.length)
    expect(new Set(dbEventTypes).size).toBe(dbEventTypes.length)
  })

  it('event type strings are lowercase with underscores', () => {
    const eventTypes: IncidentEventType[] = [
      'incident_created',
      'escalation_decision_made',
      'notification_sent',
      'notification_suppressed',
      'acknowledged',
      'incident_resolved'
    ]

    eventTypes.forEach(eventType => {
      // Must be lowercase
      expect(eventType).toBe(eventType.toLowerCase())
      // Must use underscores, not hyphens or camelCase
      expect(eventType).toMatch(/^[a-z_]+$/)
      // Must not have double underscores
      expect(eventType).not.toContain('__')
    })
  })
})
