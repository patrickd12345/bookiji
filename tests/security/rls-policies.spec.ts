import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// RLS Policy Tests
// These tests ensure that Row Level Security policies are working correctly
// and that non-admin users cannot access admin data

test.describe('RLS Policy Enforcement', () => {
  let supabase: any
  let regularUser: any
  let adminUser: any

  test.beforeAll(async () => {
    // Initialize Supabase client
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
    )
  })

  test('Non-admin users cannot access admin audit log', async () => {
    // Create a regular user session
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: 'test-user@example.com',
      password: 'testpassword123'
    })
    
    expect(signUpError).toBeNull()
    expect(user).toBeTruthy()
    
    regularUser = user

    // Try to access admin audit log as regular user
    const { data: auditLog, error: auditError } = await supabase
      .from('admin_audit_log')
      .select('*')
      .limit(1)

    // Should be denied access
    expect(auditError).toBeTruthy()
    expect(auditError.code).toBe('42501') // Permission denied
    expect(auditLog).toBeNull()
  })

  test('Non-admin users cannot access performance metrics', async () => {
    // Try to access performance metrics as regular user
    const { data: metrics, error: metricsError } = await supabase
      .from('performance_metrics')
      .select('*')
      .limit(1)

    // Should be denied access
    expect(metricsError).toBeTruthy()
    expect(metricsError.code).toBe('42501') // Permission denied
    expect(metrics).toBeNull()
  })

  test('Non-admin users cannot access SLO violations', async () => {
    // Try to access SLO violations as regular user
    const { data: violations, error: violationsError } = await supabase
      .from('slo_violations')
      .select('*')
      .limit(1)

    // Should be denied access
    expect(violationsError).toBeTruthy()
    expect(violationsError.code).toBe('42501') // Permission denied
    expect(violations).toBeNull()
  })

  test('Non-admin users cannot access cache invalidation queue', async () => {
    // Try to access cache invalidation queue as regular user
    const { data: queue, error: queueError } = await supabase
      .from('cache_invalidation_queue')
      .select('*')
      .limit(1)

    // Should be denied access
    expect(queueError).toBeTruthy()
    expect(queueError.code).toBe('42501') // Permission denied
    expect(queue).toBeNull()
  })

  test('Non-admin users cannot execute admin functions', async () => {
    // Try to execute admin functions as regular user
    const { data: sloCheck, error: sloError } = await supabase
      .rpc('check_slo_compliance')

    // Should be denied access
    expect(sloError).toBeTruthy()
    expect(sloCheck).toBeNull()

    // Try to refresh materialized views
    const { data: refresh, error: refreshError } = await supabase
      .rpc('refresh_materialized_views_staggered')

    // Should be denied access
    expect(refreshError).toBeTruthy()
    expect(refresh).toBeNull()
  })

  test('Admin users can access admin data', async () => {
    // Create an admin user session
    const { data: { user }, error: signUpError } = await supabase.auth.signUp({
      email: 'admin@bookiji.com',
      password: 'adminpassword123'
    })
    
    expect(signUpError).toBeNull()
    expect(user).toBeTruthy()
    
    adminUser = user

    // Admin should be able to access admin audit log
    const { data: auditLog, error: auditError } = await supabase
      .from('admin_audit_log')
      .select('*')
      .limit(1)

    // Should succeed (even if empty)
    expect(auditError).toBeNull()
  })

  test('RLS policies provide generic error messages', async () => {
    // Test that RLS errors don't leak internal details
    const { error: auditError } = await supabase
      .from('admin_audit_log')
      .select('*')
      .limit(1)

    if (auditError) {
      // Error message should be generic, not revealing table structure
      expect(auditError.message).not.toContain('admin_audit_log')
      expect(auditError.message).not.toContain('RLS')
      expect(auditError.message).not.toContain('policy')
      
      // Should contain generic permission denied message
      expect(auditError.message.toLowerCase()).toContain('permission')
      expect(auditError.message.toLowerCase()).toContain('denied')
    }
  })

  test('Materialized view access is properly restricted', async () => {
    // Try to access materialized views as regular user
    const { data: analytics, error: analyticsError } = await supabase
      .from('performance_analytics_5min')
      .select('*')
      .limit(1)

    // Should be denied access
    expect(analyticsError).toBeTruthy()
    expect(analyticsError.code).toBe('42501') // Permission denied
    expect(analytics).toBeNull()
  })

  test('Cache tables are properly restricted', async () => {
    // Try to access cache tables as regular user
    const { data: cache, error: cacheError } = await supabase
      .from('query_cache')
      .select('*')
      .limit(1)

    // Should be denied access
    expect(cacheError).toBeTruthy()
    expect(cacheError.code).toBe('42501') // Permission denied
    expect(cache).toBeNull()
  })

  test.afterAll(async () => {
    // Clean up test users
    if (regularUser) {
      await supabase.auth.admin.deleteUser(regularUser.id)
    }
    if (adminUser) {
      await supabase.auth.admin.deleteUser(adminUser.id)
    }
  })
})
