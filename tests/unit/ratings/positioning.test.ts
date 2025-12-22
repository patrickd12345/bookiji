import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

const localePath = path.join(process.cwd(), 'src', 'locales', 'en-US.json')
const locale = JSON.parse(fs.readFileSync(localePath, 'utf8')) as Record<string, string>

const ratingCopyKeys = [
  'rating.title',
  'rating.subtitle',
  'rating.comment_placeholder',
  'email.rating_prompt.subject',
  'email.rating_prompt.body',
  'push.rating_prompt.title',
  'push.rating_prompt.body'
]

describe('rating copy positioning', () => {
  it('keeps rating language feedback-oriented', () => {
    const combined = ratingCopyKeys.map((key) => locale[key]).join(' ')
    expect(combined).not.toMatch(/penalt|consequence|enforc|punish|fee|refund/i)
  })
})
