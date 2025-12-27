/**
 * Jarvis Phase 5 - Policy Registry Tests
 */

import { describe, it, expect } from 'vitest'
import { validatePolicyConfig, computePolicyChecksum } from './registry'
import { DEFAULT_POLICY_CONFIG } from './types'

describe('Policy Registry', () => {
  describe('validatePolicyConfig', () => {
    it('should accept valid policy config', () => {
      const errors = validatePolicyConfig(DEFAULT_POLICY_CONFIG)
      expect(errors).toHaveLength(0)
    })

    it('should reject notification_cap > 5', () => {
      const invalid = {
        ...DEFAULT_POLICY_CONFIG,
        notification_cap: 6
      }
      const errors = validatePolicyConfig(invalid)
      expect(errors).toContain('notification_cap must be <= 5, got 6')
    })

    it('should reject notification_cap < 1', () => {
      const invalid = {
        ...DEFAULT_POLICY_CONFIG,
        notification_cap: 0
      }
      const errors = validatePolicyConfig(invalid)
      expect(errors).toContain('notification_cap must be >= 1, got 0')
    })

    it('should reject missing quiet_hours', () => {
      const invalid = {
        ...DEFAULT_POLICY_CONFIG,
        quiet_hours: {} as unknown as { start: string; end: string; timezone: string }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = validatePolicyConfig(invalid as any)
      expect(errors.some(e => e.includes('quiet_hours'))).toBe(true)
    })

    it('should reject missing severity rules', () => {
      const invalid = {
        ...DEFAULT_POLICY_CONFIG,
        severity_rules: {} as unknown as { [K in 'SEV-1' | 'SEV-2' | 'SEV-3']: unknown }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const errors = validatePolicyConfig(invalid as any)
      expect(errors.some(e => e.includes('severity_rules'))).toBe(true)
    })
  })

  describe('computePolicyChecksum', () => {
    it('should compute consistent checksum for same policy', () => {
      const checksum1 = computePolicyChecksum(DEFAULT_POLICY_CONFIG)
      const checksum2 = computePolicyChecksum(DEFAULT_POLICY_CONFIG)
      expect(checksum1).toBe(checksum2)
    })

    it('should compute different checksum for different policies', () => {
      const checksum1 = computePolicyChecksum(DEFAULT_POLICY_CONFIG)
      const modified = {
        ...DEFAULT_POLICY_CONFIG,
        notification_cap: 4
      }
      const checksum2 = computePolicyChecksum(modified)
      expect(checksum1).not.toBe(checksum2)
    })
  })
})
