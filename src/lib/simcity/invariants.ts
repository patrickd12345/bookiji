import { InvariantSeverity, InvariantViolation, SimMetrics, SimState } from './types';

export interface SimInvariant {
  code: string;
  name: string;
  description: string;
  category: 'api' | 'business' | 'system' | 'data' | 'security';
  severity: InvariantSeverity;
  check: (metrics: SimMetrics, state: SimState) => Promise<InvariantViolation | null>;
}

const violation = (
  code: string,
  severity: InvariantSeverity,
  message: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  details?: Record<string, any>
): InvariantViolation => ({
  code,
  severity,
  message,
  timestamp: new Date().toISOString(),
  details,
});

export const API_INVARIANTS: SimInvariant[] = [
  {
    code: 'API_P95_RESPONSE_TIME',
    name: 'P95 Response Time',
    description: '95th percentile response time must be under 500ms',
    category: 'api',
    severity: 'critical',
    check: async (metrics) => {
      const actual = metrics.p95ResponseTime || 0;
      const threshold = 500;
      return actual < threshold
        ? null
        : violation('API_P95_RESPONSE_TIME', 'critical', `P95 response time ${actual}ms exceeds ${threshold}ms`, {
            actual,
            threshold,
          });
    },
  },
  {
    code: 'API_P99_RESPONSE_TIME',
    name: 'P99 Response Time',
    description: '99th percentile response time must be under 1000ms',
    category: 'api',
    severity: 'critical',
    check: async (metrics) => {
      const actual = metrics.p99ResponseTime || 0;
      const threshold = 1000;
      return actual < threshold
        ? null
        : violation('API_P99_RESPONSE_TIME', 'critical', `P99 response time ${actual}ms exceeds ${threshold}ms`, {
            actual,
            threshold,
          });
    },
  },
  {
    code: 'API_ERROR_RATE',
    name: 'Error Rate',
    description: 'Error rate must be under 1%',
    category: 'api',
    severity: 'critical',
    check: async (metrics) => {
      const actual = (metrics.errorRate || 0) * 100;
      const threshold = 1;
      return actual < threshold
        ? null
        : violation('API_ERROR_RATE', 'critical', `Error rate ${actual.toFixed(2)}% exceeds ${threshold}%`, {
            actual: `${actual.toFixed(2)}%`,
            threshold: `${threshold}%`,
          });
    },
  },
];

export const BUSINESS_INVARIANTS: SimInvariant[] = [
  {
    code: 'BOOKING_FUNNEL_SUCCESS',
    name: 'Booking Funnel Success',
    description: 'Success rate for booking confirm must be >= 85%',
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const totalBookings = metrics.bookingsCreated || 0;
      const confirmedBookings = metrics.bookingsConfirmed || 0;
      const actual = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 100;
      const threshold = 85;
      return actual >= threshold
        ? null
        : violation(
            'BOOKING_FUNNEL_SUCCESS',
            'critical',
            `Booking success rate ${actual.toFixed(1)}% below ${threshold}% threshold`,
            { actual: `${actual.toFixed(1)}%`, threshold: `${threshold}%`, totalBookings }
          );
    },
  },
  {
    code: 'VENDOR_SLA_RESPONSE',
    name: 'Vendor SLA Response',
    description: '90% of vendor requests must respond within 2 simulated hours',
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const totalRequests = metrics.vendorRequests || 0;
      const timelyResponses = metrics.vendorResponsesWithin2h || 0;
      const actual = totalRequests > 0 ? (timelyResponses / totalRequests) * 100 : 100;
      const threshold = 90;
      return actual >= threshold
        ? null
        : violation(
            'VENDOR_SLA_RESPONSE',
            'critical',
            `Vendor SLA compliance ${actual.toFixed(1)}% below ${threshold}%`,
            { actual: `${actual.toFixed(1)}%`, threshold: `${threshold}%`, totalRequests }
          );
    },
  },
];

export const CACHE_INVARIANTS: SimInvariant[] = [
  {
    code: 'CACHE_HIT_RATE',
    name: 'Cache Hit Rate',
    description: 'Cache hit rate must be >= 50% for search operations',
    category: 'system',
    severity: 'medium',
    check: async (metrics) => {
      const actual = (metrics.cacheHitRate || 0) * 100;
      const threshold = 50;
      return actual >= threshold
        ? null
        : violation('CACHE_HIT_RATE', 'medium', `Cache hit rate ${actual.toFixed(1)}% below ${threshold}%`, {
            actual: `${actual.toFixed(1)}%`,
            threshold: `${threshold}%`,
          });
    },
  },
  {
    code: 'CACHE_INVALIDATION_SPIKE',
    name: 'Cache Invalidation Spike',
    description: 'Cache invalidation spike must be below 35% sustained',
    category: 'system',
    severity: 'medium',
    check: async (metrics) => {
      const actual = metrics.cacheInvalidationSpike || 0;
      const threshold = 35;
      return actual < threshold
        ? null
        : violation(
            'CACHE_INVALIDATION_SPIKE',
            'medium',
            `Cache invalidation spike ${actual.toFixed(1)}% exceeds ${threshold}%`,
            { actual: `${actual.toFixed(1)}%`, threshold: `${threshold}%` }
          );
    },
  },
];

export const DATA_INVARIANTS: SimInvariant[] = [
  {
    code: 'ZERO_DOUBLE_BOOKINGS',
    name: 'Zero Double Bookings',
    description: 'No double bookings should occur',
    category: 'data',
    severity: 'critical',
    check: async (metrics) => {
      const actual = metrics.doubleBookings || 0;
      const threshold = 0;
      return actual === threshold
        ? null
        : violation('ZERO_DOUBLE_BOOKINGS', 'critical', `Double bookings detected: ${actual}`, {
            actual,
            threshold,
          });
    },
  },
  {
    code: 'NO_ORPHANED_REFERENCES',
    name: 'No Orphaned References',
    description: 'No orphaned vendor/customer references should exist',
    category: 'data',
    severity: 'critical',
    check: async (metrics) => {
      const actual = metrics.orphanedReferences || 0;
      const threshold = 0;
      return actual === threshold
        ? null
        : violation('NO_ORPHANED_REFERENCES', 'critical', `Orphaned references detected: ${actual}`, {
            actual,
            threshold,
          });
    },
  },
];

export const SYSTEM_INVARIANTS: SimInvariant[] = [
  {
    code: 'ORCHESTRATOR_TICK_DRIFT',
    name: 'Orchestrator Tick Drift',
    description: 'Tick drift must be under 100ms per real second',
    category: 'system',
    severity: 'critical',
    check: async (metrics) => {
      const actual = metrics.tickDriftMs || 0;
      const threshold = 100;
      return actual < threshold
        ? null
        : violation('ORCHESTRATOR_TICK_DRIFT', 'critical', `Tick drift ${actual.toFixed(2)}ms exceeds ${threshold}ms`, {
            actual: `${actual.toFixed(2)}ms`,
            threshold: `${threshold}ms`,
          });
    },
  },
  {
    code: 'MEMORY_USAGE',
    name: 'Memory Usage',
    description: 'Memory usage must be under 80% of available',
    category: 'system',
    severity: 'medium',
    check: async (metrics) => {
      const actual = metrics.memoryUsagePercent || 0;
      const threshold = 80;
      return actual < threshold
        ? null
        : violation('MEMORY_USAGE', 'medium', `Memory usage ${actual.toFixed(1)}% exceeds ${threshold}%`, {
            actual: `${actual.toFixed(1)}%`,
            threshold: `${threshold}%`,
          });
    },
  },
];

export const ALL_INVARIANTS = [
  ...API_INVARIANTS,
  ...BUSINESS_INVARIANTS,
  ...CACHE_INVARIANTS,
  ...DATA_INVARIANTS,
  ...SYSTEM_INVARIANTS,
];

export class InvariantChecker {
  private violations: InvariantViolation[] = [];
  private runId: string | null;
  private seed: number | null;

  constructor(runId: string | null, seed: number | null) {
    this.runId = runId;
    this.seed = seed;
  }

  async checkAll(metrics: SimMetrics, state: SimState): Promise<InvariantViolation[]> {
    this.violations = [];
    
    for (const invariant of ALL_INVARIANTS) {
      try {
        const result = await invariant.check(metrics, state);
        
        if (result) {
          this.violations.push({
            ...result,
            details: {
              ...(result.details || {}),
              runId: this.runId,
              seed: this.seed,
            },
          });
        }
      } catch (error) {
        this.violations.push(
          violation(
            `${invariant.code}_CHECK_FAILED`,
            'high',
            `Invariant check failed: ${error instanceof Error ? error.message : String(error)}`,
            { runId: this.runId, seed: this.seed }
          )
        );
      }
    }
    
    return this.violations;
  }

  getViolations(): InvariantViolation[] {
    return this.violations;
  }

  hasCriticalViolations(): boolean {
    return this.violations.some(v => v.severity === 'critical');
  }

  getSummary(): {
    total: number;
    passed: number;
    failed: number;
    critical: number;
    warnings: number;
  } {
    const total = ALL_INVARIANTS.length;
    const failed = this.violations.length;
    const passed = total - failed;
    const critical = this.violations.filter(v => v.severity === 'critical').length;
    const warnings = this.violations.filter(v => v.severity === 'medium' || v.severity === 'high').length;
    
    return { total, passed, failed, critical, warnings };
  }
}
