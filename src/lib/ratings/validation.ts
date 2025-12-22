export const MAX_RATING_COMMENT_LENGTH = 500

export function isHalfStarRating(value: number): boolean {
  if (!Number.isFinite(value)) return false
  if (value < 1 || value > 5) return false
  return Math.round(value * 2) === value * 2
}

export function isValidRatingComment(comment?: string | null): boolean {
  if (comment === undefined || comment === null) return true
  return comment.length <= MAX_RATING_COMMENT_LENGTH
}

