/**
 * Jarvis Phase 5 - Suggestion Engine Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'
import { generatePolicySuggestions } from './engine'
import { getSupabaseMock } from '../../../../tests/utils/supabase-mocks'

describe('Suggestion Engine', () => {
  beforeEach(() => {
    const mock = getSupabaseMock()
    // Mock the query chain to support gte().lte() chaining
    mock.from.mockImplementation(() => {
      const chain: any = {
        select: vi.fn(() => chain),
        gte: vi.fn(() => chain),
        lte: vi.fn(() => chain),
        in: vi.fn(() => chain),
        order: vi.fn(() => chain),
        then: vi.fn((resolve) => resolve({ data: [], error: null }))
      }
      return chain
    })
  })

  describe('generatePolicySuggestions', () => {
    it('should return empty suggestions for empty time range', async () => {
      const result = await generatePolicySuggestions({
        start: new Date('2020-01-01').toISOString(),
        end: new Date('2020-01-02').toISOString()
      })

      expect(result.suggestions).toHaveLength(0)
      expect(result.time_range.start).toBeDefined()
      expect(result.time_range.end).toBeDefined()
      expect(result.generated_at).toBeDefined()
    })

    // Note: More comprehensive tests would require mocking Supabase
    // and setting up test data. This is a basic smoke test.
  })
})
