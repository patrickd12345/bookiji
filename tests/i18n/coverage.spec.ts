import { describe, it, expect } from 'vitest'
import { spawnSync } from 'node:child_process'

describe('i18n coverage', () => {
  it('runs check-i18n script successfully', () => {
    const result = spawnSync('node', ['scripts/check-i18n.mjs'], {
      encoding: 'utf8'
    })
    if (result.error) throw result.error
    expect(result.status).toBe(0)
  })
})
