/**
 * Tests for deterministic explanation formatter
 */

import { explainDecision } from './explain'
import type { DecisionTrace } from '../escalation/decideNextAction'

describe('explainDecision', () => {
  it('should explain acknowledged_no_notify', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'acknowledged_no_notify'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('Incident acknowledged by owner; no notification sent.')
  })

  it('should explain cap_reached', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-2',
      quiet_hours: false,
      notifications_sent: 5,
      cap: 5,
      rule_fired: 'cap_reached'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('Notification cap reached (5/5); escalation paused.')
  })

  it('should explain sev1_first_notification', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('SEV-1 incident detected; immediate loud notification sent.')
  })

  it('should explain sev1_first_notification during quiet hours', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: true,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev1_first_notification'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('SEV-1 incident detected; immediate loud notification sent (during quiet hours).')
  })

  it('should explain sev2_quiet_hours_silent_only', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-2',
      quiet_hours: true,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev2_quiet_hours_silent_only'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('Quiet hours active; SEV-2 incidents cannot send loud notifications. Waiting until quiet hours end.')
  })

  it('should explain sev3_no_notification', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-3',
      quiet_hours: false,
      notifications_sent: 0,
      cap: 5,
      rule_fired: 'sev3_no_notification'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('SEV-3 incidents do not trigger notifications.')
  })

  it('should explain sev1_max_silent_exceeded', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: true,
      notifications_sent: 1,
      cap: 5,
      rule_fired: 'sev1_max_silent_exceeded'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('SEV-1 incident exceeded maximum silent period; loud escalation notification sent.')
  })

  it('should explain sev2_interval_escalation', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-2',
      quiet_hours: false,
      notifications_sent: 1,
      cap: 5,
      rule_fired: 'sev2_interval_escalation'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('SEV-2 escalation interval reached; silent update notification sent.')
  })

  it('should explain interval_wait', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-2',
      quiet_hours: false,
      notifications_sent: 1,
      cap: 5,
      rule_fired: 'interval_wait'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toBe('Next escalation scheduled; waiting for escalation interval.')
  })

  it('should handle null trace', () => {
    const explanation = explainDecision(null)
    expect(explanation).toBe('No decision trace available')
  })

  it('should handle undefined trace', () => {
    const explanation = explainDecision(undefined)
    expect(explanation).toBe('No decision trace available')
  })

  it('should handle unknown rule_fired with fallback', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-1',
      quiet_hours: true,
      notifications_sent: 2,
      cap: 5,
      rule_fired: 'unknown_rule_xyz'
    }

    const explanation = explainDecision(trace)
    expect(explanation).toContain('Decision: unknown_rule_xyz')
    expect(explanation).toContain('severity: SEV-1')
    expect(explanation).toContain('quiet hours: true')
    expect(explanation).toContain('notifications: 2/5')
  })

  it('should be deterministic (same input produces same output)', () => {
    const trace: DecisionTrace = {
      severity: 'SEV-2',
      quiet_hours: false,
      notifications_sent: 3,
      cap: 5,
      rule_fired: 'sev2_interval_escalation'
    }

    const explanation1 = explainDecision(trace)
    const explanation2 = explainDecision(trace)
    const explanation3 = explainDecision(trace)

    expect(explanation1).toBe(explanation2)
    expect(explanation2).toBe(explanation3)
  })
})
