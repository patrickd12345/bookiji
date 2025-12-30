/**
 * Operational Invariants Enforcement
 * 
 * Runtime guards that enforce environment-specific operational rules.
 * These are operational invariants, not code invariants - they prevent
 * dangerous operations from running in the wrong environment.
 * 
 * Rules enforced:
 * - SimCity is forbidden in production
 * - Live Stripe keys are only allowed in production
 * - Destructive admin operations require environment checks
 */

import { assertAppEnv, isProduction, allowsDestructiveOps } from './assertAppEnv';

/**
 * Assert that SimCity is allowed in the current environment.
 * 
 * SimCity is a chaos engineering tool that generates synthetic traffic.
 * It must never run against production.
 * 
 * @throws Error if SimCity is attempted in production
 */
export function assertSimCityAllowed(): void {
  const env = assertAppEnv();
  
  if (env === 'prod') {
    throw new Error(
      'SimCity is forbidden in production. ' +
      'SimCity may only run in local or staging environments.'
    );
  }

  // Additional check for explicit enable flag
  if (process.env.SIMCITY_ENABLED !== 'true' && process.env.SIMCITY_ALLOWED !== 'true') {
    throw new Error(
      'SimCity is not enabled. ' +
      'Set SIMCITY_ENABLED=true or SIMCITY_ALLOWED=true to enable.'
    );
  }
}

/**
 * Assert that Stripe keys match the environment.
 * 
 * Live Stripe keys (sk_live_*) must only be used in production.
 * Test keys (sk_test_*) must be used in non-production environments.
 * 
 * @param stripeSecretKey - The Stripe secret key to validate
 * @throws Error if key type doesn't match environment
 */
export function assertStripeKeyEnvironment(stripeSecretKey?: string): void {
  if (!stripeSecretKey) {
    return; // Skip validation if key is not provided
  }

  const env = assertAppEnv();
  const isLiveKey = stripeSecretKey.startsWith('sk_live_');
  const isTestKey = stripeSecretKey.startsWith('sk_test_');

  if (env === 'prod' && !isLiveKey) {
    throw new Error(
      'Production environment requires live Stripe keys (sk_live_*). ' +
      'Test keys are not allowed in production.'
    );
  }

  if (env !== 'prod' && isLiveKey) {
    throw new Error(
      'Live Stripe keys (sk_live_*) are forbidden outside production. ' +
      'Use test keys (sk_test_*) in local and staging environments.'
    );
  }

  if (!isLiveKey && !isTestKey) {
    console.warn(
      `⚠️ Stripe key format unrecognized: ${stripeSecretKey.substring(0, 10)}... ` +
      'Expected sk_live_* or sk_test_*'
    );
  }
}

/**
 * Assert that a destructive admin operation is allowed.
 * 
 * Destructive operations (bulk deletes, schema changes, data resets)
 * are forbidden in production unless explicitly confirmed.
 * 
 * @param operation - Description of the operation being attempted
 * @param requireConfirmation - Whether explicit confirmation is required (default: true for prod)
 * @throws Error if operation is forbidden in current environment
 */
export function assertDestructiveOpAllowed(
  operation: string,
  requireConfirmation: boolean = true
): void {
  if (!allowsDestructiveOps()) {
    if (requireConfirmation && !process.env.ALLOW_DESTRUCTIVE_OPS) {
      throw new Error(
        `Destructive operation "${operation}" is forbidden in production. ` +
        'Set ALLOW_DESTRUCTIVE_OPS=true to override (use with extreme caution).'
      );
    }
  }
}

/**
 * Assert that migrations can be applied automatically.
 * 
 * Auto-applying migrations is allowed in local and staging.
 * Production migrations should be reviewed and scheduled.
 * 
 * @throws Error if auto-apply is attempted in production
 */
export function assertMigrationAutoApplyAllowed(): void {
  if (isProduction()) {
    throw new Error(
      'Automatic migration application is forbidden in production. ' +
      'Migrations must be reviewed and applied manually or via CI/CD with approval.'
    );
  }
}

/**
 * Validate all operational invariants at boot time.
 * 
 * This function should be called early in the application lifecycle
 * to catch configuration errors before any operations begin.
 * 
 * @throws Error if any invariant is violated
 */
export function validateOperationalInvariants(): void {
  // Assert environment is valid
  assertAppEnv();

  // Validate Stripe keys if present
  if (process.env.STRIPE_SECRET_KEY) {
    assertStripeKeyEnvironment(process.env.STRIPE_SECRET_KEY);
  }

  // Check for SimCity in production
  if (isProduction() && process.env.SIMCITY_ENABLED === 'true') {
    throw new Error(
      'SIMCITY_ENABLED=true is set in production. ' +
      'SimCity is forbidden in production environments.'
    );
  }
}













