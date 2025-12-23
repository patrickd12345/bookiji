import { describe, it, expect, vi, afterEach } from 'vitest'
import { getOpsMode } from '@/app/api/ops/_config'

describe('getOpsMode', () => {
  const originalEnv = process.env

  afterEach(() => {
    process.env = originalEnv
    vi.resetModules()
  })

  it('should return "real" by default', () => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_OPS_MODE
    delete process.env.OPS_MODE
    expect(getOpsMode()).toBe('real')
  })

  it('should return "simcity" when NEXT_PUBLIC_OPS_MODE is "simcity"', () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_OPS_MODE: 'simcity' }
    expect(getOpsMode()).toBe('simcity')
  })

  it('should return "real" when NEXT_PUBLIC_OPS_MODE is not "simcity"', () => {
    process.env = { ...originalEnv, NEXT_PUBLIC_OPS_MODE: 'other' }
    expect(getOpsMode()).toBe('real')
  })
  
  it('should ignore OPS_MODE if NEXT_PUBLIC_OPS_MODE is set', () => {
     process.env = { ...originalEnv, NEXT_PUBLIC_OPS_MODE: 'simcity', OPS_MODE: 'real' }
     expect(getOpsMode()).toBe('simcity')
  })

  it('should return "real" if only OPS_MODE is set (deprecated behavior)', () => {
    // We decided to standardize on NEXT_PUBLIC_OPS_MODE, so OPS_MODE alone should be ignored
    process.env = { ...originalEnv, OPS_MODE: 'simcity' }
    delete process.env.NEXT_PUBLIC_OPS_MODE
    expect(getOpsMode()).toBe('real')
  })
})
























