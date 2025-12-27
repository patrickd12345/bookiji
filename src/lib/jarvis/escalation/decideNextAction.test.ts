/**
 * Jarvis Phase 3 Escalation Decision Engine Tests
 * 
 * Tests that enforce escalation invariants:
 * - SEV-2 quiet hours never produces SEND_LOUD_SMS
 * - SEV-1 quiet hours produces SEND_LOUD_SMS
 * - notification_count never exceeds cap
 * - ACK prevents further sends
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { decideNextAction } from './decideNextAction'
import * as sleepPolicy from './sleepPolicy'
import type { EscalationContext } from './decideNextAction'

// Mock sleep policy to control quiet hours
vi.mock('./sleepPolicy', async () => {
  const actual = await vi.importActual('./sleepPolicy')
  return {
    ...actual,
    getSleepPolicy: vi.fn(),
    isInQuietHours: vi.fn(),
    minutesUntilQuietHoursEnd: vi.fn()
  }
})

describe('Jarvis Phase 3 Escalation Invariants', () => {
  const now = new Date('2025-01-27T10:00:00Z').toISOString()
  const fiveMinutesAgo = new Date('2025-01-27T09:55:00Z').toISOString()
  const twoHoursAgo = new Date('2025-01-27T08:00:00Z').toISOString()

  const mockPolicy = {
    id: 'test',
    version: '1.0.0',
    quietHours: {
      start: '22:00',
      end: '07:00',
      timezone: 'America/New_York'
    },
    wakeThresholdSeverity: 'SEV-1' as const,
    maxSilentMinutes: 120,
    escalationIntervalsMinutes: [15, 30, 60, 120],
    maxNotificationsPerIncident: 5
  }

  beforeEach(() => {
    vi.clearAllMocks()
    // Default: not in quiet hours
    vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)
    vi.mocked(sleepPolicy.minutesUntilQuietHoursEnd).mockReturnValue(240)
    // Mock getSleepPolicy to return synchronously
    vi.mocked(sleepPolicy.getSleepPolicy).mockResolvedValue(mockPolicy)
  })

  describe('SEV-2 Quiet Hours Invariant', () => {
    it('SEV-2 during quiet hours never produces SEND_LOUD_SMS', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true)

      const context: EscalationContext = {
        severity: 'SEV-2',
        firstNotifiedAt: null,
        lastNotifiedAt: null,
        escalationLevel: 0,
        acknowledgedAt: null,
        notificationCount: 0
      }

      const decision = await decideNextAction(context, mockPolicy)

      // SEV-2 in quiet hours should WAIT, not SEND_LOUD_SMS
      expect(decision.type).not.toBe('SEND_LOUD_SMS')
      expect(decision.type).toBe('WAIT')
    })

    it('SEV-2 during quiet hours (first notification) waits', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true)

      const context: EscalationContext = {
        severity: 'SEV-2',
        firstNotifiedAt: null,
        lastNotifiedAt: null,
        escalationLevel: 0,
        acknowledgedAt: null,
        notificationCount: 0
      }

      const decision = await decideNextAction(context, mockPolicy)
      expect(decision.type).toBe('WAIT')
      if (decision.type === 'WAIT') {
        expect(decision.reason).toContain('Quiet hours')
      }
    })

    it('SEV-2 escalation during quiet hours waits unless maxSilentMinutes exceeded', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true)

      // First notification was 1 hour ago (not yet at maxSilentMinutes)
      const context: EscalationContext = {
        severity: 'SEV-2',
        firstNotifiedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(), // 1 hour ago
        lastNotifiedAt: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
        escalationLevel: 1,
        acknowledgedAt: null,
        notificationCount: 1
      }

      const decision = await decideNextAction(context, mockPolicy)
      // Should wait (not at maxSilentMinutes yet)
      expect(decision.type).toBe('WAIT')
    })

    it('SEV-2 escalation after maxSilentMinutes in quiet hours produces SEND_LOUD_SMS', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true)

      // First notification was 3 hours ago (exceeds maxSilentMinutes of 120)
      const context: EscalationContext = {
        severity: 'SEV-2',
        firstNotifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(), // 3 hours ago
        lastNotifiedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
        escalationLevel: 1,
        acknowledgedAt: null,
        notificationCount: 1
      }

      const decision = await decideNextAction(context, mockPolicy)
      // After maxSilentMinutes, even SEV-2 in quiet hours should escalate loudly
      expect(decision.type).toBe('SEND_LOUD_SMS')
    })
  })

  describe('SEV-1 Quiet Hours Invariant', () => {
    it('SEV-1 during quiet hours produces SEND_LOUD_SMS', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: null,
        lastNotifiedAt: null,
        escalationLevel: 0,
        acknowledgedAt: null,
        notificationCount: 0
      }

      const decision = await decideNextAction(context, mockPolicy)

      // SEV-1 can wake during quiet hours
      expect(decision.type).toBe('SEND_LOUD_SMS')
      if (decision.type === 'SEND_LOUD_SMS') {
        expect(decision.messageType).toBe('wake')
      }
    })

    it('SEV-1 escalation during quiet hours produces SEND_LOUD_SMS', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: twoHoursAgo,
        escalationLevel: 1,
        acknowledgedAt: null,
        notificationCount: 1
      }

      const decision = await decideNextAction(context, mockPolicy)
      expect(decision.type).toBe('SEND_LOUD_SMS')
      if (decision.type === 'SEND_LOUD_SMS') {
        expect(decision.messageType).toBe('escalation')
      }
    })
  })

  describe('Notification Count Cap Invariant', () => {
    it('notification_count at cap prevents further notifications', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: fiveMinutesAgo,
        escalationLevel: 4,
        acknowledgedAt: null,
        notificationCount: mockPolicy.maxNotificationsPerIncident // At cap
      }

      const decision = await decideNextAction(context, mockPolicy)

      // Should not notify when at cap
      expect(decision.type).toBe('DO_NOT_NOTIFY')
      if (decision.type === 'DO_NOT_NOTIFY') {
        expect(decision.reason).toContain('Maximum notifications')
      }
    })

    it('notification_count above cap prevents further notifications', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: fiveMinutesAgo,
        escalationLevel: 5,
        acknowledgedAt: null,
        notificationCount: mockPolicy.maxNotificationsPerIncident + 1 // Above cap
      }

      const decision = await decideNextAction(context, mockPolicy)

      // Should not notify when above cap
      expect(decision.type).toBe('DO_NOT_NOTIFY')
      if (decision.type === 'DO_NOT_NOTIFY') {
        expect(decision.reason).toContain('Maximum notifications')
      }
    })

    it('notification_count below cap allows notifications', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: fiveMinutesAgo,
        escalationLevel: 1,
        acknowledgedAt: null,
        notificationCount: 2 // Below cap of 5
      }

      const decision = await decideNextAction(context, mockPolicy)

      // Should allow notification if below cap and escalation interval met
      // (This depends on escalation intervals, but should not be DO_NOT_NOTIFY due to cap)
      if (decision.type === 'DO_NOT_NOTIFY') {
        expect(decision.reason).not.toContain('Maximum notifications')
      }
    })
  })

  describe('ACK Invariant', () => {
    it('ACK prevents further notifications', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: fiveMinutesAgo,
        escalationLevel: 1,
        acknowledgedAt: new Date().toISOString(), // Acknowledged
        notificationCount: 1
      }

      const decision = await decideNextAction(context, mockPolicy)

      // Should not notify when acknowledged
      expect(decision.type).toBe('DO_NOT_NOTIFY')
      if (decision.type === 'DO_NOT_NOTIFY') {
        expect(decision.reason).toContain('acknowledged')
      }
    })

    it('ACK prevents notifications even for SEV-1', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(true) // Even in quiet hours

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: twoHoursAgo,
        escalationLevel: 0,
        acknowledgedAt: new Date().toISOString(), // Acknowledged
        notificationCount: 1
      }

      const decision = await decideNextAction(context, mockPolicy)

      // Should not notify even SEV-1 when acknowledged
      expect(decision.type).toBe('DO_NOT_NOTIFY')
      if (decision.type === 'DO_NOT_NOTIFY') {
        expect(decision.reason).toContain('acknowledged')
      }
    })

    it('ACK prevents notifications even at escalation interval', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: twoHoursAgo,
        lastNotifiedAt: new Date(Date.now() - 20 * 60 * 1000).toISOString(), // 20 min ago (past 15min interval)
        escalationLevel: 1,
        acknowledgedAt: new Date().toISOString(), // Acknowledged
        notificationCount: 1
      }

      const decision = await decideNextAction(context, mockPolicy)

      // Should not notify even when escalation interval met
      expect(decision.type).toBe('DO_NOT_NOTIFY')
      if (decision.type === 'DO_NOT_NOTIFY') {
        expect(decision.reason).toContain('acknowledged')
      }
    })
  })

  describe('Decision Type Invariant', () => {
    it('all decisions are one of allowed types', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const allowedTypes = ['DO_NOT_NOTIFY', 'SEND_SILENT_SMS', 'SEND_LOUD_SMS', 'WAIT']

      // Test various contexts
      const contexts: EscalationContext[] = [
        {
          severity: 'SEV-1',
          firstNotifiedAt: null,
          lastNotifiedAt: null,
          escalationLevel: 0,
          acknowledgedAt: null,
          notificationCount: 0
        },
        {
          severity: 'SEV-2',
          firstNotifiedAt: null,
          lastNotifiedAt: null,
          escalationLevel: 0,
          acknowledgedAt: null,
          notificationCount: 0
        },
        {
          severity: 'SEV-3',
          firstNotifiedAt: null,
          lastNotifiedAt: null,
          escalationLevel: 0,
          acknowledgedAt: null,
          notificationCount: 0
        },
        {
          severity: 'SEV-1',
          firstNotifiedAt: twoHoursAgo,
          lastNotifiedAt: fiveMinutesAgo,
          escalationLevel: 1,
          acknowledgedAt: null,
          notificationCount: 1
        }
      ]

      for (const context of contexts) {
        const decision = await decideNextAction(context, mockPolicy)
        expect(allowedTypes).toContain(decision.type)
      }
    })
  })

  describe('Phase 4: Decision Trace Invariant', () => {
    it('all decisions must have trace', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const contexts: EscalationContext[] = [
        {
          severity: 'SEV-1',
          firstNotifiedAt: null,
          lastNotifiedAt: null,
          escalationLevel: 0,
          acknowledgedAt: null,
          notificationCount: 0
        },
        {
          severity: 'SEV-2',
          firstNotifiedAt: null,
          lastNotifiedAt: null,
          escalationLevel: 0,
          acknowledgedAt: null,
          notificationCount: 0
        },
        {
          severity: 'SEV-1',
          firstNotifiedAt: twoHoursAgo,
          lastNotifiedAt: fiveMinutesAgo,
          escalationLevel: 1,
          acknowledgedAt: null,
          notificationCount: 1
        },
        {
          severity: 'SEV-1',
          firstNotifiedAt: twoHoursAgo,
          lastNotifiedAt: fiveMinutesAgo,
          escalationLevel: 1,
          acknowledgedAt: new Date().toISOString(),
          notificationCount: 1
        }
      ]

      for (const context of contexts) {
        const decision = await decideNextAction(context, mockPolicy)
        expect(decision.trace).toBeDefined()
        expect(decision.trace).not.toBeNull()
      }
    })

    it('all traces must have required fields', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-1',
        firstNotifiedAt: null,
        lastNotifiedAt: null,
        escalationLevel: 0,
        acknowledgedAt: null,
        notificationCount: 0
      }

      const decision = await decideNextAction(context, mockPolicy)
      const trace = decision.trace

      expect(trace).toBeDefined()
      expect(trace.severity).toBeDefined()
      expect(trace.quiet_hours).toBeDefined()
      expect(typeof trace.quiet_hours).toBe('boolean')
      expect(trace.notifications_sent).toBeDefined()
      expect(typeof trace.notifications_sent).toBe('number')
      expect(trace.cap).toBeDefined()
      expect(typeof trace.cap).toBe('number')
      expect(trace.rule_fired).toBeDefined()
      expect(typeof trace.rule_fired).toBe('string')
      expect(trace.rule_fired.length).toBeGreaterThan(0)
    })

    it('traces must be JSON serializable', async () => {
      vi.mocked(sleepPolicy.isInQuietHours).mockReturnValue(false)

      const context: EscalationContext = {
        severity: 'SEV-2',
        firstNotifiedAt: null,
        lastNotifiedAt: null,
        escalationLevel: 0,
        acknowledgedAt: null,
        notificationCount: 0
      }

      const decision = await decideNextAction(context, mockPolicy)
      const trace = decision.trace

      // Should not throw
      const json = JSON.stringify(trace)
      const parsed = JSON.parse(json)

      expect(parsed.severity).toBe(trace.severity)
      expect(parsed.quiet_hours).toBe(trace.quiet_hours)
      expect(parsed.notifications_sent).toBe(trace.notifications_sent)
      expect(parsed.cap).toBe(trace.cap)
      expect(parsed.rule_fired).toBe(trace.rule_fired)
    })
  })
})

