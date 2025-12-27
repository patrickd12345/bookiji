import { NextResponse } from 'next/server'
import { createSupabaseServerClient } from '@/lib/supabaseServerClient'
import { requireAdmin } from '@/lib/auth/requireAdmin'

/**
 * AUTHORITATIVE PATH — Admin role verification required
 * See: docs/invariants/admin-ops.md INV-1
 */
export async function POST() {
  try {
    const supabase = createSupabaseServerClient()
    
    // Admin verification
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Execute SLO compliance check
    const { data: sloResults, error: sloError } = await supabase
      .rpc('check_slo_compliance')

    if (sloError) {
      console.error('SLO compliance check error:', sloError)
      return NextResponse.json({
        error: 'Failed to check SLO compliance',
        hint: 'Please try again later or contact support'
      }, { status: 500 })
    }

    // Get current SLO violations
    const { data: violations, error: violationsError } = await supabase
      .from('slo_violations')
      .select('*')
      .is('resolved_at', null)
      .order('last_violation_at', { ascending: false })
      .limit(100)

    if (violationsError) {
      console.warn('Violations fetch warning:', violationsError)
    }

    // Get SLO configuration
    const { data: sloConfig, error: configError } = await supabase
      .from('slo_config')
      .select('*')
      .order('metric_name')

    if (configError) {
      console.warn('SLO config fetch warning:', configError)
    }

    // Calculate summary statistics
    const summary = {
      totalViolations: sloResults?.total_violations || 0,
      criticalViolations: violations?.filter(v => v.severity === 'critical').length || 0,
      warningViolations: violations?.filter(v => v.severity === 'warning').length || 0,
      sloConfigurations: sloConfig?.length || 0,
      lastChecked: new Date().toISOString()
    }

    return NextResponse.json({
      summary,
      sloResults: sloResults || {},
      violations: violations || [],
      sloConfig: sloConfig || [],
      timezone: 'UTC',
      timezoneNote: 'All timestamps are in UTC'
    })

  } catch (error) {
    console.error('SLO check API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later or contact support'
    }, { status: 500 })
  }
}

export async function GET() {
  try {
    const supabase = createSupabaseServerClient()
    
    // Admin verification
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminUser = await requireAdmin(session)
    if (!adminUser) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 })
    }

    // Get current SLO violations
    const { data: violations, error: violationsError } = await supabase
      .from('slo_violations')
      .select('*')
      .is('resolved_at', null)
      .order('last_violation_at', { ascending: false })
      .limit(50)

    if (violationsError) {
      console.error('Violations fetch error:', violationsError)
      return NextResponse.json({
        error: 'Failed to fetch SLO violations',
        hint: 'Please try again later or contact support'
      }, { status: 500 })
    }

    // Get SLO configuration
    const { data: sloConfig, error: configError } = await supabase
      .from('slo_config')
      .select('*')
      .order('metric_name')

    if (configError) {
      console.warn('SLO config fetch warning:', configError)
    }

    return NextResponse.json({
      violations: violations || [],
      sloConfig: sloConfig || [],
      timezone: 'UTC',
      timezoneNote: 'All timestamps are in UTC'
    })

  } catch (error) {
    console.error('SLO violations API error:', error)
    return NextResponse.json({
      error: 'Internal server error',
      hint: 'Please try again later or contact support'
    }, { status: 500 })
  }
}
