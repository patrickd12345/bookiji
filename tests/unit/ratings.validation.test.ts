import { describe, it, expect } from 'vitest'
import {
  isHalfStarRating,
  isValidRatingComment,
  MAX_RATING_COMMENT_LENGTH
} from '@/lib/ratings/validation'

describe('rating validation', () => {
  it('accepts half-star increments between 1 and 5', () => {
    expect(isHalfStarRating(1)).toBe(true)
    expect(isHalfStarRating(1.5)).toBe(true)
    expect(isHalfStarRating(2)).toBe(true)
    expect(isHalfStarRating(4.5)).toBe(true)
    expect(isHalfStarRating(5)).toBe(true)
  })

  it('rejects values outside range or not on half-step', () => {
    expect(isHalfStarRating(0.5)).toBe(false)
    expect(isHalfStarRating(5.5)).toBe(false)
    expect(isHalfStarRating(4.2)).toBe(false)
    expect(isHalfStarRating(Number.NaN)).toBe(false)
  })

  it('validates comment length', () => {
    expect(isValidRatingComment(undefined)).toBe(true)
    expect(isValidRatingComment(null)).toBe(true)
    expect(isValidRatingComment('a'.repeat(MAX_RATING_COMMENT_LENGTH))).toBe(true)
    expect(isValidRatingComment('a'.repeat(MAX_RATING_COMMENT_LENGTH + 1))).toBe(false)
  })
})
