import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { ensureRecoveryEnv, ensureRecoveryProjectRef, ensureRecoveryVars } from '../../scripts/recovery/_lib/guard'
import { withDefaultStorageDryRun } from '../../scripts/recovery/_lib/args.mjs'

const ORIGINAL_ENV = { ...process.env }

function resetEnv() {
  process.env = { ...ORIGINAL_ENV }
}

describe('recovery guardrails', () => {
  beforeEach(() => resetEnv())
  afterEach(() => resetEnv())

  it('refuses when RECOVERY_ENV is missing or not "1"', () => {
    delete process.env.RECOVERY_ENV
    expect(() => ensureRecoveryEnv()).toThrow(/RECOVERY_ENV=1/)

    process.env.RECOVERY_ENV = '0'
    expect(() => ensureRecoveryEnv()).toThrow(/RECOVERY_ENV=1/)
  })

  it('refuses when project ref is prod-ish or denied', () => {
    process.env.RECOVERY_ENV = '1'
    process.env.SUPABASE_PROJECT_REF_RECOVERY = 'prod-main'
    expect(() => ensureRecoveryProjectRef()).toThrow(/looks like production/i)

    process.env.SUPABASE_PROJECT_REF_RECOVERY = 'safe-ref'
    process.env.RECOVERY_DENY_PROJECT_REFS = 'safe-ref,other'
    expect(() => ensureRecoveryProjectRef()).toThrow(/explicitly denied/i)
  })

  it('allows when allow-listed with RECOVERY_ENV=1', () => {
    process.env.RECOVERY_ENV = '1'
    process.env.SUPABASE_PROJECT_REF_RECOVERY = 'staging-ref'
    process.env.RECOVERY_ALLOWED_PROJECT_REFS = 'staging-ref,another'
    expect(ensureRecoveryProjectRef()).toEqual({ projectRef: 'staging-ref' })
  })
})

describe('storage import args', () => {
  it('defaults to dry-run when no apply flag is present', () => {
    const linuxArgs = withDefaultStorageDryRun(['--path', '/tmp/export'], 'linux')
    expect(linuxArgs).toContain('--dry-run')

    const winArgs = withDefaultStorageDryRun(['-Path', 'C:\\export'], 'win32')
    expect(winArgs).toContain('-DryRun')
  })

  it('does not add dry-run when apply is present', () => {
    const linuxArgs = withDefaultStorageDryRun(['--path', '/tmp/export', '--apply'], 'linux')
    expect(linuxArgs).not.toContain('--dry-run')

    const winArgs = withDefaultStorageDryRun(['-Path', 'C:\\export', '-Apply'], 'win32')
    expect(winArgs).not.toContain('-DryRun')
  })
})

describe('recovery database url', () => {
  beforeEach(() => resetEnv())
  afterEach(() => resetEnv())

  it('rejects prod-like database hosts', () => {
    process.env.SUPABASE_PROJECT_REF_RECOVERY = 'safe-ref'

    process.env.DATABASE_URL_RECOVERY = 'https://prod-db.example.com:5432/postgres'
    expect(() => ensureRecoveryVars()).toThrow(/looks like production/i)

    process.env.DATABASE_URL_RECOVERY = 'https://production-db.example.com:5432/postgres'
    expect(() => ensureRecoveryVars()).toThrow(/looks like production/i)
  })

  it('accepts localhost and typical recovery hosts', () => {
    process.env.SUPABASE_PROJECT_REF_RECOVERY = 'safe-ref'

    process.env.DATABASE_URL_RECOVERY = 'http://localhost:5432/postgres'
    expect(ensureRecoveryVars().databaseUrl).toContain('localhost')

    process.env.DATABASE_URL_RECOVERY = 'http://127.0.0.1:5432/postgres'
    expect(ensureRecoveryVars().databaseUrl).toContain('127.0.0.1')

    process.env.DATABASE_URL_RECOVERY = 'https://db.recovery.internal:5432/postgres'
    expect(ensureRecoveryVars().databaseUrl).toContain('db.recovery.internal')
  })

  it('rejects non-URL database values', () => {
    process.env.SUPABASE_PROJECT_REF_RECOVERY = 'safe-ref'
    process.env.DATABASE_URL_RECOVERY = 'not-a-url'
    expect(() => ensureRecoveryVars()).toThrow(/invalid/i)
  })
})
