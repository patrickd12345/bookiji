/**
 * Chaos Engineering Utilities for Playwright Tests
 * 
 * Provides chaos injection capabilities for testing system resilience
 * and graceful degradation under failure conditions.
 */

export interface ChaosConfig {
  enabled?: boolean;
  latencyMs?: number;
  failureRate?: number;
  timeoutRate?: number;
  supabaseFailRate?: number;
  aiFailRate?: number;
  paymentFailRate?: number;
}

export const DEFAULT_CHAOS_CONFIG: ChaosConfig = {
  enabled: false,
  latencyMs: 0,
  failureRate: 0,
  timeoutRate: 0,
  supabaseFailRate: 0,
  aiFailRate: 0,
  paymentFailRate: 0,
};

/**
 * Load chaos configuration from environment variables
 */
export function loadChaosFromEnv(): ChaosConfig {
  return {
    enabled: process.env.CHAOS_ENABLED === 'true',
    latencyMs: parseInt(process.env.CHAOS_LATENCY_MS || '0'),
    failureRate: parseFloat(process.env.CHAOS_FAILURE_RATE || '0'),
    timeoutRate: parseFloat(process.env.CHAOS_TIMEOUT_RATE || '0'),
    supabaseFailRate: parseFloat(process.env.CHAOS_SUPABASE_FAIL_RATE || '0'),
    aiFailRate: parseFloat(process.env.CHAOS_AI_FAIL_RATE || '0'),
    paymentFailRate: parseFloat(process.env.CHAOS_PAYMENT_FAIL_RATE || '0'),
  };
}

/**
 * Install chaos middleware by intercepting network requests
 */
export async function installChaos(page: any, config: Partial<ChaosConfig> = {}) {
  const chaosConfig = { ...DEFAULT_CHAOS_CONFIG, ...loadChaosFromEnv(), ...config };
  
  if (!chaosConfig.enabled) {
    return; // Chaos disabled
  }

  await page.route('**/*', async (route: any) => {
    const url = route.request().url();
    const method = route.request().method();
    
    // Determine if this request should be affected by chaos
    let shouldFail = false;
    let failureRate = chaosConfig.failureRate || 0;
    
    // Service-specific failure rates
    if (url.includes('supabase') || url.includes('/auth/')) {
      failureRate = Math.max(failureRate, chaosConfig.supabaseFailRate || 0);
    } else if (url.includes('ollama') || url.includes('/ai-')) {
      failureRate = Math.max(failureRate, chaosConfig.aiFailRate || 0);
    } else if (url.includes('stripe') || url.includes('/pay')) {
      failureRate = Math.max(failureRate, chaosConfig.paymentFailRate || 0);
    }
    
    // Roll for failure
    shouldFail = Math.random() < failureRate;
    
    // Roll for timeout
    const shouldTimeout = Math.random() < (chaosConfig.timeoutRate || 0);
    
    if (shouldTimeout) {
      // Simulate timeout by delaying indefinitely
      await new Promise(resolve => setTimeout(resolve, 30000));
      return route.abort('timedout');
    }
    
    if (shouldFail) {
      // Return different error types based on service
      if (url.includes('supabase') || url.includes('/auth/')) {
        return route.fulfill({
          status: 503,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Service temporarily unavailable',
            message: 'Please try again later'
          })
        });
      } else {
        return route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({
            error: 'Internal server error',
            message: 'Something went wrong'
          })
        });
      }
    }
    
    // Add artificial latency
    if (chaosConfig.latencyMs && chaosConfig.latencyMs > 0) {
      await new Promise(resolve => setTimeout(resolve, chaosConfig.latencyMs));
    }
    
    // Continue with normal request
    return route.continue();
  });
}

/**
 * Chaos presets for different testing scenarios
 */
export const CHAOS_PRESETS = {
  light: {
    enabled: true,
    latencyMs: 150,
    failureRate: 0.05,
    timeoutRate: 0.02,
    supabaseFailRate: 0.10,
  },
  storm: {
    enabled: true,
    latencyMs: 400,
    failureRate: 0.15,
    timeoutRate: 0.08,
    supabaseFailRate: 0.30,
    aiFailRate: 0.25,
  },
  offline: {
    enabled: true,
    failureRate: 1.0, // All requests fail
    supabaseFailRate: 1.0,
    aiFailRate: 1.0,
  }
} as const;
