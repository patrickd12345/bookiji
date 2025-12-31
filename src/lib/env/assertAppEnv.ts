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
  const env = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV;
  
  if (!env) {
    throw new Error(
      'APP_ENV is required but not set. ' +
      'Set APP_ENV to one of: local, staging, prod'
    );
  }
  
  if (!ALLOWED_ENVIRONMENTS.includes(env as AppEnvironment)) {
    throw new Error(
      `Invalid APP_ENV: "${env}". ` +
      `Must be one of: ${ALLOWED_ENVIRONMENTS.join(', ')}`
    );
  }
  
  return env as AppEnvironment;
}

/**
 * Get the current APP_ENV without assertion.
 * Useful for conditional logic where missing env should return undefined.
 * 
 * @returns The APP_ENV value if valid, undefined otherwise
 */
export function getAppEnv(): AppEnvironment | undefined {
  const env = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV;
  if (env && ALLOWED_ENVIRONMENTS.includes(env as AppEnvironment)) {
    return env as AppEnvironment;
  }
  return undefined;
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























