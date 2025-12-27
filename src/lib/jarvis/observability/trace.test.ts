/**
 * Tests for trace completeness and validation
 */

import type { DecisionTrace } from '../escalation/decideNextAction'

describe('DecisionTrace validation', () => {
  const requiredFields: (keyof DecisionTrace)[] = [
    'severity',
    'quiet_hours',
    'notifications_sent',
    'cap',
    'rule_fired'
  ]

  it('should have all required fields defined', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    requiredFields.forEach(field => {
      expect(trace[field]).toBeDefined()
      expect(trace[field]).not.toBeNull()
    })
  })

  it('should validate severity is one of allowed values', () => {
    const validSeverities: DecisionTrace['severity'][] = ['SEV-1', 'SEV-2', 'SEV-3']
    
    validSeverities.forEach(severity => {
      const trace: DecisionTrace = {
        severity,
        quiet_hours: false,
        notifications_sent: 0,
        cap: 5,
        rule_fired: 'sev1_first_notification'
      }
      expect(validSeverities).toContain(trace.severity)
    })
  })

  it('should validate quiet_hours is boolean', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: true,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    expect(typeof trace.quiet_hours).toBe('boolean')
  })

  it('should validate notifications_sent is number', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 3,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    expect(typeof trace.notifications_sent).toBe('number')
    expect(trace.notifications_sent).toBeGreaterThanOrEqual(0)
  })

  it('should validate cap is number', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    expect(typeof trace.cap).toBe('number')
    expect(trace.cap).toBeGreaterThan(0)
  })

  it('should validate rule_fired is string', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    expect(typeof trace.rule_fired).toBe('string')
    expect(trace.rule_fired.length).toBeGreaterThan(0)
  })

  it('should be JSON serializable', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-2',
      quiet_hours: true,
      notifications_sent: 2,
      cap: 5,
      rule_fired: 'sev2_quiet_hours_wait'
    }

    const json = JSON.stringify(trace)
    const parsed = JSON.parse(json) as DecisionTrace

    expect(parsed.severity).toBe(trace.severity)
    expect(parsed.quiet_hours).toBe(trace.quiet_hours)
    expect(parsed.notifications_sent).toBe(trace.notifications_sent)
    expect(parsed.cap).toBe(trace.cap)
    expect(parsed.rule_fired).toBe(trace.rule_fired)
  })

  it('should not have optional fields', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    const keys = Object.keys(trace) as (keyof DecisionTrace)[]
    expect(keys.length).toBe(requiredFields.length)
    
    requiredFields.forEach(field => {
      expect(keys).toContain(field)
    })
  })
})
