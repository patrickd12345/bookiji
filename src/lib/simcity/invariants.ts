export interface SimInvariant {
  id: string;
  name: string;
  description: string;
  category: 'api' | 'business' | 'system' | 'data';
  severity: 'critical' | 'warning';
  check: (metrics: any, state: any) => Promise<InvariantResult>;
}

export interface InvariantResult {
  passed: boolean;
  actual: any;
  threshold: any;
  message: string;
  timestamp: string;
}

export interface InvariantViolation {
  invariant: SimInvariant;
  result: InvariantResult;
  runId: string;
  seed: number;
  context: any;
}

// API SLOs
export const API_INVARIANTS: SimInvariant[] = [
  {
    id: 'api_p95_response_time',
    name: 'P95 Response Time',
    description: '95th percentile response time must be < 500ms',
    category: 'api',
    severity: 'critical',
    check: async (metrics, state) => {
      const actual = metrics.p95ResponseTime || 0;
      const threshold = 500;
      const passed = actual < threshold;
      
      return {
        passed,
        actual,
        threshold,
        message: `P95 response time: ${actual}ms (threshold: ${threshold}ms)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'api_p99_response_time',
    name: 'P99 Response Time',
    description: '99th percentile response time must be < 1000ms',
    category: 'api',
    severity: 'critical',
    check: async (metrics, state) => {
      const actual = metrics.p99ResponseTime || 0;
      const threshold = 1000;
      const passed = actual < threshold;
      
      return {
        passed,
        actual,
        threshold,
        message: `P99 response time: ${actual}ms (threshold: ${threshold}ms)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'api_error_rate',
    name: 'Error Rate',
    description: 'Error rate must be < 1%',
    category: 'api',
    severity: 'critical',
    check: async (metrics, state) => {
      const actual = (metrics.errorRate || 0) * 100;
      const threshold = 1;
      const passed = actual < threshold;
      
      return {
        passed,
        actual: actual.toFixed(2) + '%',
        threshold: threshold + '%',
        message: `Error rate: ${actual.toFixed(2)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Business Metrics
export const BUSINESS_INVARIANTS: SimInvariant[] = [
  {
    id: 'booking_funnel_success',
    name: 'Booking Funnel Success',
    description: 'Success rate for book → confirm must be ≥ 85%',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const totalBookings = metrics.bookingsCreated || 0;
      const confirmedBookings = metrics.bookingsConfirmed || 0;
      const actual = totalBookings > 0 ? (confirmedBookings / totalBookings) * 100 : 100;
      const threshold = 85;
      const passed = actual >= threshold;
      
      return {
        passed,
        actual: actual.toFixed(1) + '%',
        threshold: threshold + '%',
        message: `Booking success rate: ${actual.toFixed(1)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'vendor_sla_response',
    name: 'Vendor SLA Response',
    description: '90% of vendor requests must respond within ≤ 2 simulated hours',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const totalRequests = metrics.vendorRequests || 0;
      const timelyResponses = metrics.vendorResponsesWithin2h || 0;
      const actual = totalRequests > 0 ? (timelyResponses / totalRequests) * 100 : 100;
      const threshold = 90;
      const passed = actual >= threshold;
      
      return {
        passed,
        actual: actual.toFixed(1) + '%',
        threshold: threshold + '%',
        message: `Vendor SLA compliance: ${actual.toFixed(1)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Cache Performance
export const CACHE_INVARIANTS: SimInvariant[] = [
  {
    id: 'cache_hit_rate',
    name: 'Cache Hit Rate',
    description: 'Cache hit rate must be ≥ 50% for search operations',
    category: 'system',
    severity: 'warning',
    check: async (metrics, state) => {
      const actual = (metrics.cacheHitRate || 0) * 100;
      const threshold = 50;
      const passed = actual >= threshold;
      
      return {
        passed,
        actual: actual.toFixed(1) + '%',
        threshold: threshold + '%',
        message: `Cache hit rate: ${actual.toFixed(1)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'cache_invalidation_spike',
    name: 'Cache Invalidation Spike',
    description: 'Cache invalidation spike must be < 35% sustained',
    category: 'system',
    severity: 'warning',
    check: async (metrics, state) => {
      const actual = metrics.cacheInvalidationSpike || 0;
      const threshold = 35;
      const passed = actual < threshold;
      
      return {
        passed,
        actual: actual.toFixed(1) + '%',
        threshold: threshold + '%',
        message: `Cache invalidation spike: ${actual.toFixed(1)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Data Integrity
export const DATA_INVARIANTS: SimInvariant[] = [
  {
    id: 'zero_double_bookings',
    name: 'Zero Double Bookings',
    description: 'No double bookings should occur',
    category: 'data',
    severity: 'critical',
    check: async (metrics, state) => {
      const actual = metrics.doubleBookings || 0;
      const threshold = 0;
      const passed = actual === threshold;
      
      return {
        passed,
        actual,
        threshold,
        message: `Double bookings detected: ${actual} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'no_orphaned_references',
    name: 'No Orphaned References',
    description: 'No orphaned vendor/customer references should exist',
    category: 'data',
    severity: 'critical',
    check: async (metrics, state) => {
      const actual = metrics.orphanedReferences || 0;
      const threshold = 0;
      const passed = actual === threshold;
      
      return {
        passed,
        actual,
        threshold,
        message: `Orphaned references: ${actual} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// System Health
export const SYSTEM_INVARIANTS: SimInvariant[] = [
  {
    id: 'orchestrator_tick_drift',
    name: 'Orchestrator Tick Drift',
    description: 'Tick drift must be < 100ms per real second',
    category: 'system',
    severity: 'critical',
    check: async (metrics, state) => {
      const actual = metrics.tickDriftMs || 0;
      const threshold = 100;
      const passed = actual < threshold;
      
      return {
        passed,
        actual: actual.toFixed(2) + 'ms',
        threshold: threshold + 'ms',
        message: `Tick drift: ${actual.toFixed(2)}ms (threshold: ${threshold}ms)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'memory_usage',
    name: 'Memory Usage',
    description: 'Memory usage must be < 80% of available',
    category: 'system',
    severity: 'warning',
    check: async (metrics, state) => {
      const actual = metrics.memoryUsagePercent || 0;
      const threshold = 80;
      const passed = actual < threshold;
      
      return {
        passed,
        actual: actual.toFixed(1) + '%',
        threshold: threshold + '%',
        message: `Memory usage: ${actual.toFixed(1)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// All invariants
export const ALL_INVARIANTS = [
  ...API_INVARIANTS,
  ...BUSINESS_INVARIANTS,
  ...CACHE_INVARIANTS,
  ...DATA_INVARIANTS,
  ...SYSTEM_INVARIANTS
];

// Invariant checker
export class InvariantChecker {
  private violations: InvariantViolation[] = [];
  private runId: string;
  private seed: number;

  constructor(runId: string, seed: number) {
    this.runId = runId;
    this.seed = seed;
  }

  async checkAll(metrics: any, state: any): Promise<InvariantViolation[]> {
    this.violations = [];
    
    for (const invariant of ALL_INVARIANTS) {
      try {
        const result = await invariant.check(metrics, state);
        
        if (!result.passed) {
          this.violations.push({
            invariant,
            result,
            runId: this.runId,
            seed: this.seed,
            context: { metrics, state }
          });
        }
              } catch (error) {
          console.error(`Invariant check failed for ${invariant.id}:`, error);
          // Mark as violation if check itself fails
          this.violations.push({
            invariant,
            result: {
              passed: false,
              actual: 'ERROR',
              threshold: 'N/A',
              message: `Invariant check failed: ${error instanceof Error ? error.message : String(error)}`,
              timestamp: new Date().toISOString()
            },
            runId: this.runId,
            seed: this.seed,
            context: { metrics, state, error: error instanceof Error ? error.message : String(error) }
          });
        }
    }
    
    return this.violations;
  }

  getViolations(): InvariantViolation[] {
    return this.violations;
  }

  hasCriticalViolations(): boolean {
    return this.violations.some(v => v.invariant.severity === 'critical');
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
    const critical = this.violations.filter(v => v.invariant.severity === 'critical').length;
    const warnings = this.violations.filter(v => v.invariant.severity === 'warning').length;
    
    return { total, passed, failed, critical, warnings };
  }
}
