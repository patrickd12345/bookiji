import { SimInvariant } from '../invariants';
import { InvariantSeverity, InvariantViolation } from '../types';

const violation = (
  code: string,
  severity: InvariantSeverity,
  message: string,
  details?: Record<string, any>
): InvariantViolation => ({
  code,
  severity,
  message,
  timestamp: new Date().toISOString(),
  details,
});

// Payments & Idempotency Chaos
export const PAYMENT_INVARIANTS: SimInvariant[] = [
  {
    code: 'IDEMPOTENT_PAYMENTS',
    name: 'Idempotent Payments',
    description: 'Same payment intent retried yields exactly one charge, one booking',
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const duplicateCharges = metrics.duplicateCharges || 0;
      const threshold = 0;
      return duplicateCharges === threshold
        ? null
        : violation('IDEMPOTENT_PAYMENTS', 'critical', `Duplicate charges detected: ${duplicateCharges}`, {
            actual: duplicateCharges,
            threshold,
          });
    },
  },
  {
    code: 'REFUND_SYMMETRY',
    name: 'Refund Symmetry',
    description: 'Refund moves booking state to "refunded"; no stranded invoices',
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const strandedInvoices = metrics.strandedInvoices || 0;
      const threshold = 0;
      return strandedInvoices === threshold
        ? null
        : violation('REFUND_SYMMETRY', 'critical', `Stranded invoices detected: ${strandedInvoices}`, {
            actual: strandedInvoices,
            threshold,
          });
    },
  },
  {
    code: 'NO_ORPHAN_INVOICES',
    name: 'No Orphan Invoices',
    description: 'All invoices have corresponding bookings or refunds',
    category: 'data',
    severity: 'critical',
    check: async (metrics) => {
      const orphanInvoices = metrics.orphanInvoices || 0;
      const threshold = 0;
      return orphanInvoices === threshold
        ? null
        : violation('NO_ORPHAN_INVOICES', 'critical', `Orphan invoices detected: ${orphanInvoices}`, {
            actual: orphanInvoices,
            threshold,
          });
    },
  },
];

// Auth & Session Gauntlet
export const AUTH_INVARIANTS: SimInvariant[] = [
  {
    code: 'JWT_REFRESH_OK',
    name: 'JWT Refresh Resilience',
    description: 'Active flows survive token refresh without 401 loops',
    category: 'api',
    severity: 'critical',
    check: async (metrics) => {
      const refreshLoops = metrics.jwtRefreshLoops || 0;
      const threshold = 0;
      return refreshLoops === threshold
        ? null
        : violation('JWT_REFRESH_OK', 'critical', `JWT refresh loops detected: ${refreshLoops}`, {
            actual: refreshLoops,
            threshold,
          });
    },
  },
  {
    code: 'CLOCK_SKEW_TOLERATED',
    name: 'Clock Skew Tolerance',
    description: '90s skew does not break login or signed URLs',
    category: 'system',
    severity: 'critical',
    check: async (metrics) => {
      const clockSkewFailures = metrics.clockSkewFailures || 0;
      const threshold = 0;
      return clockSkewFailures === threshold
        ? null
        : violation('CLOCK_SKEW_TOLERATED', 'critical', `Clock skew failures detected: ${clockSkewFailures}`, {
            actual: clockSkewFailures,
            threshold,
          });
    },
  },
  {
    code: 'NO_RLS_REGRESSION',
    name: 'No RLS Regression',
    description: "Non-admin can't read admin APIs ever",
    category: 'security',
    severity: 'critical',
    check: async (metrics) => {
      const unauthorizedAdminAccess = metrics.unauthorizedAdminAccess || 0;
      const threshold = 0;
      return unauthorizedAdminAccess === threshold
        ? null
        : violation('NO_RLS_REGRESSION', 'critical', `Unauthorized admin access: ${unauthorizedAdminAccess}`, {
            actual: unauthorizedAdminAccess,
            threshold,
          });
    },
  },
];

// Multi-Tenant Isolation Probe
export const TENANT_INVARIANTS: SimInvariant[] = [
  {
    code: 'NO_CROSS_TENANT_READS',
    name: 'No Cross-Tenant Reads',
    description: 'Zero cross-tenant data access',
    category: 'security',
    severity: 'critical',
    check: async (metrics) => {
      const crossTenantReads = metrics.crossTenantReads || 0;
      const threshold = 0;
      return crossTenantReads === threshold
        ? null
        : violation('NO_CROSS_TENANT_READS', 'critical', `Cross-tenant reads detected: ${crossTenantReads}`, {
            actual: crossTenantReads,
            threshold,
          });
    },
  },
  {
    code: 'CACHE_TENANT_ISOLATION',
    name: 'Cache Tenant Isolation',
    description: 'Cache hit-rate per tenant meets target; no cross-tenant cache pollution',
    category: 'system',
    severity: 'medium',
    check: async (metrics) => {
      const cacheIsolationScore = metrics.cacheIsolationScore || 100;
      const threshold = 95;
      return cacheIsolationScore >= threshold
        ? null
        : violation(
            'CACHE_TENANT_ISOLATION',
            'medium',
            `Cache isolation score ${cacheIsolationScore.toFixed(1)}% below ${threshold}%`,
            { actual: `${cacheIsolationScore.toFixed(1)}%`, threshold: `${threshold}%` }
          );
    },
  },
];

// DST & Calendar Chaos
export const DST_INVARIANTS: SimInvariant[] = [
  {
    code: 'DST_SAFE_BOOKINGS',
    name: 'DST-Safe Bookings',
    description: "DST transitions don't duplicate/skip slots",
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const dstBookingErrors = metrics.dstBookingErrors || 0;
      const threshold = 0;
      return dstBookingErrors === threshold
        ? null
        : violation('DST_SAFE_BOOKINGS', 'critical', `DST booking errors: ${dstBookingErrors}`, {
            actual: dstBookingErrors,
            threshold,
          });
    },
  },
  {
    code: 'TZ_NORMALIZATION',
    name: 'Timezone Normalization',
    description: 'All stored in UTC; display correct in user TZ',
    category: 'data',
    severity: 'medium',
    check: async (metrics) => {
      const tzDisplayErrors = metrics.tzDisplayErrors || 0;
      const threshold = 0;
      return tzDisplayErrors === threshold
        ? null
        : violation('TZ_NORMALIZATION', 'medium', `Timezone display errors: ${tzDisplayErrors}`, {
            actual: tzDisplayErrors,
            threshold,
          });
    },
  },
  {
    code: 'RESCHEDULE_INTEGRITY',
    name: 'Reschedule Integrity',
    description: "Moving across DST doesn't double-book",
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const dstDoubleBookings = metrics.dstDoubleBookings || 0;
      const threshold = 0;
      return dstDoubleBookings === threshold
        ? null
        : violation('RESCHEDULE_INTEGRITY', 'critical', `DST double bookings: ${dstDoubleBookings}`, {
            actual: dstDoubleBookings,
            threshold,
          });
    },
  },
];

// Abuse & DoS Protection
export const ABUSE_INVARIANTS: SimInvariant[] = [
  {
    code: 'ABUSE_THROTTLED',
    name: 'Abuse Throttled',
    description: 'WAF/rate-limit holds; admin APIs never overwhelmed',
    category: 'security',
    severity: 'critical',
    check: async (metrics) => {
      const adminApiOverwhelm = metrics.adminApiOverwhelm || 0;
      const threshold = 0;
      return adminApiOverwhelm === threshold
        ? null
        : violation('ABUSE_THROTTLED', 'critical', `Admin API overwhelm events: ${adminApiOverwhelm}`, {
            actual: adminApiOverwhelm,
            threshold,
          });
    },
  },
  {
    code: 'INPUT_SANITIZED',
    name: 'Input Sanitized',
    description: "Huge payloads & weird Unicode don't crash or corrupt",
    category: 'security',
    severity: 'critical',
    check: async (metrics) => {
      const inputSanitizationFailures = metrics.inputSanitizationFailures || 0;
      const threshold = 0;
      return inputSanitizationFailures === threshold
        ? null
        : violation(
            'INPUT_SANITIZED',
            'critical',
            `Input sanitization failures: ${inputSanitizationFailures}`,
            { actual: inputSanitizationFailures, threshold }
          );
    },
  },
];

// Webhook & Exactly-Once Semantics
export const WEBHOOK_INVARIANTS: SimInvariant[] = [
  {
    code: 'WEBHOOK_EXACTLY_ONCE',
    name: 'Webhook Exactly-Once',
    description: 'Webhook idempotency enforced; no duplicate state transitions',
    category: 'business',
    severity: 'critical',
    check: async (metrics) => {
      const duplicateWebhookTransitions = metrics.duplicateWebhookTransitions || 0;
      const threshold = 0;
      return duplicateWebhookTransitions === threshold
        ? null
        : violation(
            'WEBHOOK_EXACTLY_ONCE',
            'critical',
            `Duplicate webhook transitions: ${duplicateWebhookTransitions}`,
            { actual: duplicateWebhookTransitions, threshold }
          );
    },
  },
];

// File Upload & Storage Resilience
export const STORAGE_INVARIANTS: SimInvariant[] = [
  {
    code: 'UPLOAD_RESILIENCE',
    name: 'Upload Resilience',
    description: 'Partial uploads cleaned; no orphan blobs',
    category: 'system',
    severity: 'medium',
    check: async (metrics) => {
      const orphanBlobs = metrics.orphanBlobs || 0;
      const threshold = 0;
      return orphanBlobs === threshold
        ? null
        : violation('UPLOAD_RESILIENCE', 'medium', `Orphan blobs detected: ${orphanBlobs}`, {
            actual: orphanBlobs,
            threshold,
          });
    },
  },
  {
    code: 'SIGNED_URL_ENFORCED',
    name: 'Signed URL Enforcement',
    description: 'Downloads blocked after expiry; cache not bypassing auth',
    category: 'security',
    severity: 'critical',
    check: async (metrics) => {
      const expiredUrlAccess = metrics.expiredUrlAccess || 0;
      const threshold = 0;
      return expiredUrlAccess === threshold
        ? null
        : violation('SIGNED_URL_ENFORCED', 'critical', `Expired URL access: ${expiredUrlAccess}`, {
            actual: expiredUrlAccess,
            threshold,
          });
    },
  },
];

// Deployment & Migration Safety
export const DEPLOYMENT_INVARIANTS: SimInvariant[] = [
  {
    code: 'ZERO_DOWNTIME_ROLLOUT',
    name: 'Zero Downtime Rollout',
    description: 'P99 < 1.2s during rollout; error-rate < 2%',
    category: 'system',
    severity: 'critical',
    check: async (metrics) => {
      const rolloutP99 = metrics.rolloutP99 || 0;
      const threshold = 1200;
      return rolloutP99 < threshold
        ? null
        : violation('ZERO_DOWNTIME_ROLLOUT', 'critical', `Rollout P99 ${rolloutP99}ms exceeds ${threshold}ms`, {
            actual: `${rolloutP99}ms`,
            threshold: `${threshold}ms`,
          });
    },
  },
  {
    code: 'ROLLBACK_RECOVERS',
    name: 'Rollback Recovery',
    description: 'Rollback + "Invalidate All" restores health within 2 min',
    category: 'system',
    severity: 'critical',
    check: async (metrics) => {
      const rollbackRecoveryTime = metrics.rollbackRecoveryTime || 0;
      const threshold = 120; // 2 minutes in seconds
      return rollbackRecoveryTime <= threshold
        ? null
        : violation(
            'ROLLBACK_RECOVERS',
            'critical',
            `Rollback recovery time ${rollbackRecoveryTime}s exceeds ${threshold}s`,
            { actual: `${rollbackRecoveryTime}s`, threshold: `${threshold}s` }
          );
    },
  },
];

// Search & Index Continuity
export const SEARCH_INVARIANTS: SimInvariant[] = [
  {
    code: 'SEARCH_CONTINUITY',
    name: 'Search Continuity',
    description: 'P95 < 700ms during REINDEX/REFRESH',
    category: 'api',
    severity: 'medium',
    check: async (metrics) => {
      const reindexP95 = metrics.reindexP95 || 0;
      const threshold = 700;
      return reindexP95 < threshold
        ? null
        : violation('SEARCH_CONTINUITY', 'medium', `Reindex P95 ${reindexP95}ms exceeds ${threshold}ms`, {
            actual: `${reindexP95}ms`,
            threshold: `${threshold}ms`,
          });
    },
  },
  {
    code: 'NO_STALE_VISIBILITY',
    name: 'No Stale Visibility',
    description: 'New providers appear within 1 min after publish',
    category: 'business',
    severity: 'medium',
    check: async (metrics) => {
      const staleVisibilityDelay = metrics.staleVisibilityDelay || 0;
      const threshold = 60; // 1 minute in seconds
      return staleVisibilityDelay <= threshold
        ? null
        : violation(
            'NO_STALE_VISIBILITY',
            'medium',
            `Stale visibility delay ${staleVisibilityDelay}s exceeds ${threshold}s`,
            { actual: `${staleVisibilityDelay}s`, threshold: `${threshold}s` }
          );
    },
  },
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
  ...SEARCH_INVARIANTS,
];
