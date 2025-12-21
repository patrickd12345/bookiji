import { URL } from 'node:url'

type GuardResult = {
  databaseUrl: string
  projectRef: string
}

const PROD_REF_PATTERN = /(prod|production)/i
const PROD_HOST_PATTERN = /(prod|production)/i

function parseList(value?: string): string[] {
  return (value ?? '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean)
}

function ensureAllowDeny(projectRef: string): void {
  const allowList = parseList(process.env.RECOVERY_ALLOWED_PROJECT_REFS)
  const denyList = parseList(process.env.RECOVERY_DENY_PROJECT_REFS)

  if (denyList.includes(projectRef)) {
    throw new Error(`Recovery project ref "${projectRef}" is explicitly denied.`)
  }
  if (allowList.length > 0 && !allowList.includes(projectRef)) {
    throw new Error(`Recovery project ref "${projectRef}" is not in RECOVERY_ALLOWED_PROJECT_REFS.`)
  }
}

export function ensureRecoveryEnv(): void {
  if (process.env.RECOVERY_ENV !== '1') {
    throw new Error('RECOVERY_ENV=1 is required to run recovery commands.')
  }
}

export function ensureRecoveryProjectRef(): { projectRef: string } {
  const projectRef = process.env.SUPABASE_PROJECT_REF_RECOVERY
  if (!projectRef) {
    throw new Error('SUPABASE_PROJECT_REF_RECOVERY is required.')
  }

  ensureAllowDeny(projectRef)

  if (PROD_REF_PATTERN.test(projectRef)) {
    throw new Error(`Project ref "${projectRef}" looks like production.`)
  }

  return { projectRef }
}

export function ensureRecoveryVars(): GuardResult {
  const { projectRef } = ensureRecoveryProjectRef()
  const databaseUrl = process.env.DATABASE_URL_RECOVERY

  if (!databaseUrl) {
    throw new Error('DATABASE_URL_RECOVERY is required.')
  }

  try {
    const host = new URL(databaseUrl).hostname
    if (PROD_HOST_PATTERN.test(host)) {
      throw new Error(`Database host "${host}" looks like production.`)
    }
  } catch (err) {
    throw new Error(`DATABASE_URL_RECOVERY is invalid: ${(err as Error).message}`)
  }

  return { databaseUrl, projectRef }
}
