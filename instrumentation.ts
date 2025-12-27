/**
 * Next.js Instrumentation Hook
 * 
 * This file runs once when the server starts, before any requests are handled.
 * Use this to enforce environment isolation and operational invariants at boot time.
 */

import { validateOperationalInvariants } from './src/lib/env/operationalInvariants';

export async function register() {
  // Only run on server-side
  if (typeof window === 'undefined') {
    try {
      // Validate all operational invariants at boot time
      // This will throw if:
      // - APP_ENV is invalid or missing
      // - Stripe keys don't match environment
      // - SimCity is enabled in production
      validateOperationalInvariants();
      
      console.log('✅ Environment isolation validated');
    } catch (error) {
      // Log error but don't crash in development (allow graceful degradation)
      const env = process.env.APP_ENV || process.env.NODE_ENV;
      if (env === 'production' || env === 'prod') {
        // In production, this is a fatal error
        console.error('❌ CRITICAL: Environment isolation validation failed:', error);
        throw error;
      } else {
        // In non-prod, warn but continue (allows development flexibility)
        console.warn('⚠️ Environment isolation validation failed (non-fatal in non-prod):', error);
      }
    }
  }
}

