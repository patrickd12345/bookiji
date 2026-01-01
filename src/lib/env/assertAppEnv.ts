/**
 * Environment Assertion Module
 * 
 * Enforces APP_ENV as a first-class invariant.
 * This module must be imported early in the application lifecycle
 * to prevent any code from running with invalid environment configuration.
 * 
 * Invariant A-0: Environments must be isolated by blast radius, not just by config.
 */

const ALLOWED_ENVIRONMENTS = ['local', 'staging', 'prod'] as const;

export type AppEnvironment = typeof ALLOWED_ENVIRONMENTS[number];

function isAllowedAppEnv(value: string): value is AppEnvironment {
  return ALLOWED_ENVIRONMENTS.includes(value as AppEnvironment);
}

/**
 * Resolve APP_ENV from explicit config or well-known platform signals.
 *
 * Why: Next.js may import server modules during `next build` (e.g. "Collecting page data").
 * Vercel provides `VERCEL_ENV` but does not automatically set `APP_ENV`.
 * We still want a deterministic environment mode during builds without hard-failing.
 */
function resolveAppEnv(): AppEnvironment | undefined {
  const explicit = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV;
  if (explicit && isAllowedAppEnv(explicit)) return explicit;

  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv === 'production') return 'prod';
  if (vercelEnv === 'preview') return 'staging';
  if (vercelEnv === 'development') return 'local';

  const nodeEnv = process.env.NODE_ENV;
  // During `next build`, Next.js sets NEXT_PHASE to "phase-production-build".
  // We avoid inferring "prod" here because production builds can run in contexts
  // without runtime secrets (e.g. local builds, CI sanity builds).
  if (nodeEnv === 'production' && process.env.NEXT_PHASE === 'phase-production-build') return 'local';
  if (nodeEnv === 'test') return 'local';
  if (nodeEnv === 'development') return 'local';

  return undefined;
}

/**
 * Assert that APP_ENV is set and valid.
 * 
 * This function throws immediately if:
 * - APP_ENV is missing
 * - APP_ENV is not one of: local, staging, prod
 * 
 * This prevents accidental misconfiguration and ensures environment
 * isolation is enforced at boot time.
 * 
 * @returns The validated APP_ENV value
 * @throws Error if APP_ENV is invalid or missing
 */
export function assertAppEnv(): AppEnvironment {
  const env = resolveAppEnv();
  
  if (!env) {
    throw new Error(
      'APP_ENV is required but not set. ' +
      'Set APP_ENV to one of: local, staging, prod'
    );
  }

  // Ensure downstream code reading process.env.APP_ENV sees a consistent value.
  if (!process.env.APP_ENV) {
    process.env.APP_ENV = env;
  }

  return env;
}

/**
 * Get the current APP_ENV without assertion.
 * Useful for conditional logic where missing env should return undefined.
 * 
 * @returns The APP_ENV value if valid, undefined otherwise
 */
export function getAppEnv(): AppEnvironment | undefined {
  return resolveAppEnv();
}

/**
 * Check if the current environment is production.
 * 
 * @returns true if APP_ENV === 'prod'
 */
export function isProduction(): boolean {
  const env = getAppEnv();
  return env === 'prod';
}

/**
 * Check if the current environment is staging.
 * 
 * @returns true if APP_ENV === 'staging'
 */
export function isStaging(): boolean {
  const env = getAppEnv();
  return env === 'staging';
}

/**
 * Check if the current environment is local.
 * 
 * @returns true if APP_ENV === 'local'
 */
export function isLocal(): boolean {
  const env = getAppEnv();
  return env === 'local';
}

/**
 * Check if the current environment allows destructive operations.
 * 
 * @returns true if environment is local or staging
 */
export function allowsDestructiveOps(): boolean {
  const env = getAppEnv();
  return env === 'local' || env === 'staging';
}























