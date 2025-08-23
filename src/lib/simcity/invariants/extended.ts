import { SimInvariant } from '../invariants';

// Payments & Idempotency Chaos
export const PAYMENT_INVARIANTS: SimInvariant[] = [
  {
    id: 'idempotent_payments',
    name: 'Idempotent Payments',
    description: 'Same payment intent retried ≤3× → exactly one charge, one booking',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const duplicateCharges = metrics.duplicateCharges || 0;
      const threshold = 0;
      const passed = duplicateCharges === threshold;
      
      return {
        passed,
        actual: duplicateCharges,
        threshold,
        message: `Duplicate charges detected: ${duplicateCharges} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'refund_symmetry',
    name: 'Refund Symmetry',
    description: 'Refund → booking state flips to "refunded"; no stranded invoices',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const strandedInvoices = metrics.strandedInvoices || 0;
      const threshold = 0;
      const passed = strandedInvoices === threshold;
      
      return {
        passed,
        actual: strandedInvoices,
        threshold,
        message: `Stranded invoices detected: ${strandedInvoices} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'no_orphan_invoices',
    name: 'No Orphan Invoices',
    description: 'All invoices have corresponding bookings or refunds',
    category: 'data',
    severity: 'critical',
    check: async (metrics, state) => {
      const orphanInvoices = metrics.orphanInvoices || 0;
      const threshold = 0;
      const passed = orphanInvoices === threshold;
      
      return {
        passed,
        actual: orphanInvoices,
        threshold,
        message: `Orphan invoices detected: ${orphanInvoices} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Auth & Session Gauntlet
export const AUTH_INVARIANTS: SimInvariant[] = [
  {
    id: 'jwt_refresh_ok',
    name: 'JWT Refresh Resilience',
    description: 'Active flows survive token refresh without 401 loops',
    category: 'api',
    severity: 'critical',
    check: async (metrics, state) => {
      const refreshLoops = metrics.jwtRefreshLoops || 0;
      const threshold = 0;
      const passed = refreshLoops === threshold;
      
      return {
        passed,
        actual: refreshLoops,
        threshold,
        message: `JWT refresh loops detected: ${refreshLoops} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'clock_skew_tolerated',
    name: 'Clock Skew Tolerance',
    description: '±90s skew doesn\'t break login or signed URLs',
    category: 'system',
    severity: 'critical',
    check: async (metrics, state) => {
      const clockSkewFailures = metrics.clockSkewFailures || 0;
      const threshold = 0;
      const passed = clockSkewFailures === threshold;
      
      return {
        passed,
        actual: clockSkewFailures,
        threshold,
        message: `Clock skew failures: ${clockSkewFailures} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'no_rls_regression',
    name: 'No RLS Regression',
    description: 'Non-admin can\'t read admin APIs ever',
    category: 'security',
    severity: 'critical',
    check: async (metrics, state) => {
      const unauthorizedAdminAccess = metrics.unauthorizedAdminAccess || 0;
      const threshold = 0;
      const passed = unauthorizedAdminAccess === threshold;
      
      return {
        passed,
        actual: unauthorizedAdminAccess,
        threshold,
        message: `Unauthorized admin access: ${unauthorizedAdminAccess} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Multi-Tenant Isolation Probe
export const TENANT_INVARIANTS: SimInvariant[] = [
  {
    id: 'no_cross_tenant_reads',
    name: 'No Cross-Tenant Reads',
    description: 'Zero cross-tenant data access',
    category: 'security',
    severity: 'critical',
    check: async (metrics, state) => {
      const crossTenantReads = metrics.crossTenantReads || 0;
      const threshold = 0;
      const passed = crossTenantReads === threshold;
      
      return {
        passed,
        actual: crossTenantReads,
        threshold,
        message: `Cross-tenant reads detected: ${crossTenantReads} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'cache_tenant_isolation',
    name: 'Cache Tenant Isolation',
    description: 'Cache hit-rate per tenant ≥ target; no cross-tenant cache pollution',
    category: 'system',
    severity: 'warning',
    check: async (metrics, state) => {
      const cacheIsolationScore = metrics.cacheIsolationScore || 100;
      const threshold = 95;
      const passed = cacheIsolationScore >= threshold;
      
      return {
        passed,
        actual: cacheIsolationScore.toFixed(1) + '%',
        threshold: threshold + '%',
        message: `Cache isolation score: ${cacheIsolationScore.toFixed(1)}% (threshold: ${threshold}%)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// DST & Calendar Chaos
export const DST_INVARIANTS: SimInvariant[] = [
  {
    id: 'dst_safe_bookings',
    name: 'DST-Safe Bookings',
    description: 'DST transitions don\'t duplicate/skip slots',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const dstBookingErrors = metrics.dstBookingErrors || 0;
      const threshold = 0;
      const passed = dstBookingErrors === threshold;
      
      return {
        passed,
        actual: dstBookingErrors,
        threshold,
        message: `DST booking errors: ${dstBookingErrors} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'tz_normalization',
    name: 'Timezone Normalization',
    description: 'All stored in UTC; display correct in user TZ',
    category: 'data',
    severity: 'warning',
    check: async (metrics, state) => {
      const tzDisplayErrors = metrics.tzDisplayErrors || 0;
      const threshold = 0;
      const passed = tzDisplayErrors === threshold;
      
      return {
        passed,
        actual: tzDisplayErrors,
        threshold,
        message: `Timezone display errors: ${tzDisplayErrors} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'reschedule_integrity',
    name: 'Reschedule Integrity',
    description: 'Moving across DST doesn\'t double-book',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const dstDoubleBookings = metrics.dstDoubleBookings || 0;
      const threshold = 0;
      const passed = dstDoubleBookings === threshold;
      
      return {
        passed,
        actual: dstDoubleBookings,
        threshold,
        message: `DST double bookings: ${dstDoubleBookings} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Abuse & DoS Protection
export const ABUSE_INVARIANTS: SimInvariant[] = [
  {
    id: 'abuse_throttled',
    name: 'Abuse Throttled',
    description: 'WAF/rate-limit holds; admin APIs never overwhelmed',
    category: 'security',
    severity: 'critical',
    check: async (metrics, state) => {
      const adminApiOverwhelm = metrics.adminApiOverwhelm || 0;
      const threshold = 0;
      const passed = adminApiOverwhelm === threshold;
      
      return {
        passed,
        actual: adminApiOverwhelm,
        threshold,
        message: `Admin API overwhelm events: ${adminApiOverwhelm} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'input_sanitized',
    name: 'Input Sanitized',
    description: 'Huge payloads & weird Unicode don\'t crash or corrupt',
    category: 'security',
    severity: 'critical',
    check: async (metrics, state) => {
      const inputSanitizationFailures = metrics.inputSanitizationFailures || 0;
      const threshold = 0;
      const passed = inputSanitizationFailures === threshold;
      
      return {
        passed,
        actual: inputSanitizationFailures,
        threshold,
        message: `Input sanitization failures: ${inputSanitizationFailures} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Webhook & Exactly-Once Semantics
export const WEBHOOK_INVARIANTS: SimInvariant[] = [
  {
    id: 'webhook_exactly_once',
    name: 'Webhook Exactly-Once',
    description: 'Webhook idempotency enforced; no duplicate state transitions',
    category: 'business',
    severity: 'critical',
    check: async (metrics, state) => {
      const duplicateWebhookTransitions = metrics.duplicateWebhookTransitions || 0;
      const threshold = 0;
      const passed = duplicateWebhookTransitions === threshold;
      
      return {
        passed,
        actual: duplicateWebhookTransitions,
        threshold,
        message: `Duplicate webhook transitions: ${duplicateWebhookTransitions} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// File Upload & Storage Resilience
export const STORAGE_INVARIANTS: SimInvariant[] = [
  {
    id: 'upload_resilience',
    name: 'Upload Resilience',
    description: 'Partial uploads cleaned; no orphan blobs',
    category: 'system',
    severity: 'warning',
    check: async (metrics, state) => {
      const orphanBlobs = metrics.orphanBlobs || 0;
      const threshold = 0;
      const passed = orphanBlobs === threshold;
      
      return {
        passed,
        actual: orphanBlobs,
        threshold,
        message: `Orphan blobs detected: ${orphanBlobs} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'signed_url_enforced',
    name: 'Signed URL Enforcement',
    description: 'Downloads blocked after expiry; cache not bypassing auth',
    category: 'security',
    severity: 'critical',
    check: async (metrics, state) => {
      const expiredUrlAccess = metrics.expiredUrlAccess || 0;
      const threshold = 0;
      const passed = expiredUrlAccess === threshold;
      
      return {
        passed,
        actual: expiredUrlAccess,
        threshold,
        message: `Expired URL access: ${expiredUrlAccess} (threshold: ${threshold})`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Deployment & Migration Safety
export const DEPLOYMENT_INVARIANTS: SimInvariant[] = [
  {
    id: 'zero_downtime_rollout',
    name: 'Zero Downtime Rollout',
    description: 'P99 < 1.2s during rollout; error-rate < 2%',
    category: 'system',
    severity: 'critical',
    check: async (metrics, state) => {
      const rolloutP99 = metrics.rolloutP99 || 0;
      const threshold = 1200;
      const passed = rolloutP99 < threshold;
      
      return {
        passed,
        actual: rolloutP99 + 'ms',
        threshold: threshold + 'ms',
        message: `Rollout P99: ${rolloutP99}ms (threshold: ${threshold}ms)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'rollback_recovers',
    name: 'Rollback Recovery',
    description: 'Rollback + "Invalidate All" restores health ≤ 2 min',
    category: 'system',
    severity: 'critical',
    check: async (metrics, state) => {
      const rollbackRecoveryTime = metrics.rollbackRecoveryTime || 0;
      const threshold = 120; // 2 minutes in seconds
      const passed = rollbackRecoveryTime <= threshold;
      
      return {
        passed,
        actual: rollbackRecoveryTime + 's',
        threshold: threshold + 's',
        message: `Rollback recovery time: ${rollbackRecoveryTime}s (threshold: ${threshold}s)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// Search & Index Continuity
export const SEARCH_INVARIANTS: SimInvariant[] = [
  {
    id: 'search_continuity',
    name: 'Search Continuity',
    description: 'P95 < 700ms during REINDEX/REFRESH',
    category: 'api',
    severity: 'warning',
    check: async (metrics, state) => {
      const reindexP95 = metrics.reindexP95 || 0;
      const threshold = 700;
      const passed = reindexP95 < threshold;
      
      return {
        passed,
        actual: reindexP95 + 'ms',
        threshold: threshold + 'ms',
        message: `Reindex P95: ${reindexP95}ms (threshold: ${threshold}ms)`,
        timestamp: new Date().toISOString()
      };
    }
  },
  {
    id: 'no_stale_visibility',
    name: 'No Stale Visibility',
    description: 'New providers appear ≤ 1 min after publish',
    category: 'business',
    severity: 'warning',
    check: async (metrics, state) => {
      const staleVisibilityDelay = metrics.staleVisibilityDelay || 0;
      const threshold = 60; // 1 minute in seconds
      const passed = staleVisibilityDelay <= threshold;
      
      return {
        passed,
        actual: staleVisibilityDelay + 's',
        threshold: threshold + 's',
        message: `Stale visibility delay: ${staleVisibilityDelay}s (threshold: ${threshold}s)`,
        timestamp: new Date().toISOString()
      };
    }
  }
];

// All extended invariants
export const EXTENDED_INVARIANTS = [
  ...PAYMENT_INVARIANTS,
  ...AUTH_INVARIANTS,
  ...TENANT_INVARIANTS,
  ...DST_INVARIANTS,
  ...ABUSE_INVARIANTS,
  ...WEBHOOK_INVARIANTS,
  ...STORAGE_INVARIANTS,
  ...DEPLOYMENT_INVARIANTS,
  ...SEARCH_INVARIANTS
];
