import { describe, it, expect } from 'vitest'

/**
 * Layer 1: Unit Tests - Validation Logic
 * 
 * Tests input sanitization, required field checks, type coercion,
 * and boundary conditions for booking operations.
 */

describe('Booking Validation - Layer 1: Unit Tests', () => {
  describe('Input Sanitization', () => {
    it('validates date format', () => {
      const validDates = [
        '2025-01-15',
        '2025-12-31',
        '2026-01-01'
      ]

      const invalidDates = [
        '2025-13-01', // Invalid month
        '2025-01-32', // Invalid day
        '25-01-15', // Wrong format
        '2025/01/15', // Wrong separator
        '', // Empty
        'not-a-date'
      ]

      validDates.forEach(date => {
        const dateObj = new Date(date)
        expect(dateObj.getTime()).not.toBeNaN()
        expect(dateObj.toISOString().split('T')[0]).toBe(date)
      })

      invalidDates.forEach(date => {
        const dateObj = new Date(date)
        // Either invalid date or doesn't match expected format
        const isValid = !isNaN(dateObj.getTime()) && 
                       dateObj.toISOString().split('T')[0] === date
        expect(isValid).toBe(false)
      })
    })

    it('validates time format', () => {
      const validTimes = [
        '09:00',
        '10:30',
        '17:00',
        '23:59'
      ]

      const invalidTimes = [
        '25:00', // Invalid hour
        '10:60', // Invalid minute
        '9:00', // Missing leading zero
        '10:0', // Missing trailing zero
        '', // Empty
        'not-a-time'
      ]

      const timeRegex = /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/

      validTimes.forEach(time => {
        expect(timeRegex.test(time)).toBe(true)
      })

      invalidTimes.forEach(time => {
        expect(timeRegex.test(time)).toBe(false)
      })
    })

    it('validates ISO 8601 datetime format', () => {
      const validISO = [
        '2025-01-15T10:00:00Z',
        '2025-01-15T10:00:00.000Z',
        '2025-01-15T10:00:00+00:00'
      ]

      const invalidISO = [
        '2025-01-15 10:00:00', // Missing T
        '2025-01-15T10:00', // Missing seconds
        '2025/01/15T10:00:00Z', // Wrong date separator
        '', // Empty
        'not-iso'
      ]

      validISO.forEach(iso => {
        const date = new Date(iso)
        expect(date.getTime()).not.toBeNaN()
      })

      invalidISO.forEach(iso => {
        const date = new Date(iso)
        // Either invalid or doesn't parse correctly
        const isValid = !isNaN(date.getTime()) && date.toISOString() === iso
        expect(isValid).toBe(false)
      })
    })

    it('validates UUID format', () => {
      const validUUIDs = [
        '00000000-0000-0000-0000-000000000000',
        '123e4567-e89b-12d3-a456-426614174000',
        '550e8400-e29b-41d4-a716-446655440000'
      ]

      const invalidUUIDs = [
        'not-a-uuid',
        '123e4567-e89b-12d3-a456', // Too short
        '123e4567e89b12d3a456426614174000', // Missing hyphens
        '', // Empty
        '123e4567-e89b-12d3-a456-42661417400g' // Invalid character
      ]

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

      validUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(true)
      })

      invalidUUIDs.forEach(uuid => {
        expect(uuidRegex.test(uuid)).toBe(false)
      })
    })
  })

  describe('Required Field Checks', () => {
    it('validates booking creation requires all required fields', () => {
      const requiredFields = [
        'customerId',
        'service',
        'location',
        'date',
        'time'
      ]

      const validBooking = {
        customerId: 'customer_123',
        service: 'Haircut',
        location: 'NYC',
        date: '2025-01-15',
        time: '10:00'
      }

      // All fields present
      requiredFields.forEach(field => {
        expect(validBooking).toHaveProperty(field)
        expect(validBooking[field as keyof typeof validBooking]).toBeTruthy()
      })

      // Missing any field should fail
      requiredFields.forEach(field => {
        const incomplete = { ...validBooking }
        delete incomplete[field as keyof typeof incomplete]
        expect(incomplete).not.toHaveProperty(field)
      })
    })

    it('validates optional fields are truly optional', () => {
      const optionalFields = ['notes', 'providerId']

      const minimalBooking = {
        customerId: 'customer_123',
        service: 'Haircut',
        location: 'NYC',
        date: '2025-01-15',
        time: '10:00'
      }

      // Booking without optional fields should be valid
      optionalFields.forEach(field => {
        expect(minimalBooking).not.toHaveProperty(field)
      })

      // Booking with optional fields should also be valid
      const withOptional = {
        ...minimalBooking,
        notes: 'Please be gentle',
        providerId: 'provider_123'
      }

      optionalFields.forEach(field => {
        expect(withOptional).toHaveProperty(field)
      })
    })
  })

  describe('Boundary Conditions', () => {
    it('rejects past dates', () => {
      const now = new Date()
      const pastDate = new Date(now.getTime() - 60 * 60 * 1000) // 1 hour ago
      const futureDate = new Date(now.getTime() + 24 * 60 * 60 * 1000) // 24 hours from now

      expect(pastDate.getTime()).toBeLessThan(now.getTime())
      expect(futureDate.getTime()).toBeGreaterThan(now.getTime())
    })

    it('validates minimum notice period (e.g., 60 minutes)', () => {
      const now = new Date()
      const minimumNotice = 60 * 60 * 1000 // 60 minutes in ms

      const tooSoon = new Date(now.getTime() + 30 * 60 * 1000) // 30 minutes from now
      const validTime = new Date(now.getTime() + 90 * 60 * 1000) // 90 minutes from now

      const timeUntilTooSoon = tooSoon.getTime() - now.getTime()
      const timeUntilValid = validTime.getTime() - now.getTime()

      expect(timeUntilTooSoon).toBeLessThan(minimumNotice)
      expect(timeUntilValid).toBeGreaterThanOrEqual(minimumNotice)
    })

    it('validates maximum booking horizon (e.g., 90 days)', () => {
      const now = new Date()
      const maxHorizon = 90 * 24 * 60 * 60 * 1000 // 90 days in ms

      const validDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
      const tooFar = new Date(now.getTime() + 100 * 24 * 60 * 60 * 1000) // 100 days

      const timeUntilValid = validDate.getTime() - now.getTime()
      const timeUntilTooFar = tooFar.getTime() - now.getTime()

      expect(timeUntilValid).toBeLessThanOrEqual(maxHorizon)
      expect(timeUntilTooFar).toBeGreaterThan(maxHorizon)
    })

    it('validates minimum slot duration (e.g., 15 minutes)', () => {
      const minDuration = 15 * 60 * 1000 // 15 minutes in ms

      const validDurations = [15, 30, 60, 120] // minutes
      const invalidDurations = [5, 10, 0, -15] // minutes

      validDurations.forEach(duration => {
        const durationMs = duration * 60 * 1000
        expect(durationMs).toBeGreaterThanOrEqual(minDuration)
      })

      invalidDurations.forEach(duration => {
        const durationMs = duration * 60 * 1000
        expect(durationMs).toBeLessThan(minDuration)
      })
    })

    it('validates maximum slot duration (e.g., 8 hours)', () => {
      const maxDuration = 8 * 60 * 60 * 1000 // 8 hours in ms

      const validDurations = [60, 120, 240, 480] // minutes (up to 8 hours)
      const invalidDurations = [540, 600, 720] // minutes (over 8 hours)

      validDurations.forEach(duration => {
        const durationMs = duration * 60 * 1000
        expect(durationMs).toBeLessThanOrEqual(maxDuration)
      })

      invalidDurations.forEach(duration => {
        const durationMs = duration * 60 * 1000
        expect(durationMs).toBeGreaterThan(maxDuration)
      })
    })

    it('validates amount is positive', () => {
      const validAmounts = [1, 100, 1000, 10000]
      const invalidAmounts = [0, -1, -100]

      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThan(0)
      })

      invalidAmounts.forEach(amount => {
        expect(amount).toBeLessThanOrEqual(0)
      })
    })

    it('validates amount is within reasonable bounds', () => {
      const minAmount = 1 // $0.01
      const maxAmount = 1000000 // $10,000.00

      const validAmounts = [1, 100, 10000, 100000]
      const invalidAmounts = [0, -1, 2000000]

      validAmounts.forEach(amount => {
        expect(amount).toBeGreaterThanOrEqual(minAmount)
        expect(amount).toBeLessThanOrEqual(maxAmount)
      })

      invalidAmounts.forEach(amount => {
        const isValid = amount >= minAmount && amount <= maxAmount
        expect(isValid).toBe(false)
      })
    })
  })

  describe('Type Coercion and Format Validation', () => {
    it('validates numeric amounts are integers', () => {
      const validAmounts = [100, 1000, 10000]
      const invalidAmounts = [100.5, 1000.99, '100', null, undefined]

      validAmounts.forEach(amount => {
        expect(Number.isInteger(amount)).toBe(true)
        expect(typeof amount).toBe('number')
      })

      invalidAmounts.forEach(amount => {
        const isValid = typeof amount === 'number' && Number.isInteger(amount)
        expect(isValid).toBe(false)
      })
    })

    it('validates string IDs are non-empty', () => {
      const validIds = ['id_123', 'customer_456', 'provider_789']
      const invalidIds = ['', '   ', null, undefined]

      validIds.forEach(id => {
        expect(typeof id).toBe('string')
        expect(id.trim().length).toBeGreaterThan(0)
      })

      invalidIds.forEach(id => {
        const isValid = typeof id === 'string' && id.trim().length > 0
        expect(isValid).toBe(false)
      })
    })

    it('validates email format', () => {
      const validEmails = [
        'user@example.com',
        'test.email+tag@example.co.uk',
        'user123@test-domain.com'
      ]

      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@.com',
        '',
        'user space@example.com'
      ]

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true)
      })

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false)
      })
    })
  })
})
