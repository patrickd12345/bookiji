#!/usr/bin/env tsx
/**
 * HealthAI - System Health Monitoring Agent
 * 
 * Guardian of system health and platform integrity.
 * 
 * Responsibilities:
 * - Monitor all health endpoints
 * - Detect unhealthy subsystems early (DB, API, cache, queues, webhooks)
 * - Correlate health degradation with upstream/downstream components
 * - NEVER trigger actions—only inform and recommend
 * 
 * Scope:
 * - /ops/health
 * - /ops/health/db
 * - /ops/health/webhooks
 * - /ops/health/cache
 * - /ops/health/search
 * - /ops/health/auth
 */

interface HealthCheckResult {
  endpoint: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  timestamp: string
  latency?: number
  data?: any
  error?: string
}

interface Correlation {
  subsystem: string
  status: 'healthy' | 'degraded' | 'unhealthy'
  dependencies: string[]
  rootCauseCandidates: string[]
  recommendations: string[]
}

class HealthAI {
  private baseUrl: string
  private checks: HealthCheckResult[] = []
  private correlations: Correlation[] = []

  constructor(baseUrl: string = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl.replace(/\/$/, '')
  }

  /**
   * Monitor all health endpoints
   */
  async monitorAll(): Promise<void> {
    console.log('🔍 HealthAI: Starting comprehensive health monitoring...\n')
    console.log(`📍 Base URL: ${this.baseUrl}\n`)

    const endpoints = [
      '/api/ops/health',
      '/api/ops/health/db',
      '/api/ops/health/webhooks',
      '/api/ops/health/cache',
      '/api/ops/health/search',
      '/api/ops/health/auth'
    ]

    // Check all endpoints in parallel
    const results = await Promise.allSettled(
      endpoints.map(endpoint => this.checkEndpoint(endpoint))
    )

    this.checks = results
      .map((result, index) => {
        if (result.status === 'fulfilled') {
          return result.value
        } else {
          return {
            endpoint: endpoints[index],
            status: 'unhealthy' as const,
            timestamp: new Date().toISOString(),
            error: result.reason?.message || 'Check failed'
          }
        }
      })
      .filter(Boolean) as HealthCheckResult[]

    // Analyze and correlate
    this.analyzeHealth()
    this.correlateIssues()
    this.generateReport()
  }

  /**
   * Check a single health endpoint
   */
  private async checkEndpoint(endpoint: string): Promise<HealthCheckResult> {
    const startTime = Date.now()
    const url = `${this.baseUrl}${endpoint}`

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'HealthAI-Monitor/1.0'
        },
        signal: AbortSignal.timeout(10000) // 10 second timeout
      })

      const latency = Date.now() - startTime
      let data = null
      try {
        data = await response.json()
      } catch {
        // Response might not be JSON
        data = { status: response.ok ? 'healthy' : 'unhealthy' }
      }

      return {
        endpoint,
        status: data?.status || (response.ok ? 'healthy' : 'unhealthy'),
        timestamp: new Date().toISOString(),
        latency,
        data,
        error: response.ok ? undefined : `HTTP ${response.status}`
      }
    } catch (error) {
      const latency = Date.now() - startTime
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Provide helpful error messages
      if (errorMessage.includes('ECONNREFUSED') || errorMessage.includes('fetch failed')) {
        return {
          endpoint,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          latency,
          error: `Connection refused - server may not be running at ${this.baseUrl}`
        }
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('AbortError')) {
        return {
          endpoint,
          status: 'unhealthy',
          timestamp: new Date().toISOString(),
          latency,
          error: 'Request timeout - endpoint took too long to respond'
        }
      }

      return {
        endpoint,
        status: 'unhealthy',
        timestamp: new Date().toISOString(),
        latency,
        error: errorMessage
      }
    }
  }

  /**
   * Analyze health status across all checks
   */
  private analyzeHealth(): void {
    const unhealthy = this.checks.filter(c => c.status === 'unhealthy')
    const degraded = this.checks.filter(c => c.status === 'degraded')
    const healthy = this.checks.filter(c => c.status === 'healthy')

    console.log('📊 Health Status Summary:')
    console.log(`   ✅ Healthy: ${healthy.length}/${this.checks.length}`)
    console.log(`   ⚠️  Degraded: ${degraded.length}/${this.checks.length}`)
    console.log(`   ❌ Unhealthy: ${unhealthy.length}/${this.checks.length}\n`)

    if (unhealthy.length > 0) {
      console.log('🚨 Unhealthy Subsystems:')
      unhealthy.forEach(check => {
        console.log(`   • ${this.getSubsystemName(check.endpoint)}`)
        if (check.error) {
          console.log(`     Error: ${check.error}`)
        }
        if (check.latency && check.latency > 5000) {
          console.log(`     Latency: ${check.latency}ms (elevated)`)
        }
      })
      console.log()
    }

    if (degraded.length > 0) {
      console.log('⚠️  Degraded Subsystems:')
      degraded.forEach(check => {
        console.log(`   • ${this.getSubsystemName(check.endpoint)}`)
        if (check.data?.recommendations) {
          const recs = check.data.recommendations.slice(0, 2)
          recs.forEach((rec: string) => console.log(`     - ${rec}`))
        }
      })
      console.log()
    }
  }

  /**
   * Correlate issues across subsystems
   */
  private correlateIssues(): void {
    this.correlations = []

    // Database correlation
    const dbCheck = this.checks.find(c => c.endpoint.includes('/db'))
    if (dbCheck && dbCheck.status !== 'healthy') {
      this.correlations.push({
        subsystem: 'Database',
        status: dbCheck.status,
        dependencies: ['Search', 'Auth', 'Cache'], // DB issues affect these
        rootCauseCandidates: [
          'Database connection pool exhausted',
          'Network connectivity issues',
          'Database server overload',
          'RLS policy misconfiguration',
          'Supabase service degradation'
        ],
        recommendations: dbCheck.data?.recommendations || [
          'Check database connection pool settings',
          'Review slow query logs',
          'Verify Supabase service status',
          'Check network connectivity to database'
        ]
      })
    }

    // Cache correlation
    const cacheCheck = this.checks.find(c => c.endpoint.includes('/cache'))
    if (cacheCheck && cacheCheck.status !== 'healthy') {
      this.correlations.push({
        subsystem: 'Cache',
        status: cacheCheck.status,
        dependencies: ['Search'], // Cache issues affect search performance
        rootCauseCandidates: [
          'Cache invalidation queue backlog',
          'Cache worker process failure',
          'Database write performance degradation',
          'High cache invalidation rate'
        ],
        recommendations: cacheCheck.data?.recommendations || [
          'Review cache invalidation queue',
          'Check cache worker process status',
          'Monitor cache hit rates',
          'Consider adjusting cache TTLs'
        ]
      })
    }

    // Webhook correlation
    const webhookCheck = this.checks.find(c => c.endpoint.includes('/webhooks'))
    if (webhookCheck && webhookCheck.status !== 'healthy') {
      this.correlations.push({
        subsystem: 'Webhooks',
        status: webhookCheck.status,
        dependencies: ['Database'], // Webhooks write to DB
        rootCauseCandidates: [
          'Downstream service unavailability',
          'Webhook signature verification failures',
          'Database write failures',
          'DLQ processing backlog'
        ],
        recommendations: webhookCheck.data?.recommendations || [
          'Review DLQ size and contents',
          'Check downstream service status',
          'Verify webhook signature configuration',
          'Review webhook processing logs'
        ]
      })
    }

    // Search correlation
    const searchCheck = this.checks.find(c => c.endpoint.includes('/search'))
    if (searchCheck && searchCheck.status !== 'healthy') {
      this.correlations.push({
        subsystem: 'Search',
        status: searchCheck.status,
        dependencies: ['Database', 'Cache'], // Search depends on DB and cache
        rootCauseCandidates: [
          'Database query performance degradation',
          'Cache miss rate increase',
          'Vector search (pgvector) unavailability',
          'High search query load'
        ],
        recommendations: searchCheck.data?.recommendations || [
          'Review database query performance',
          'Check cache hit rates',
          'Verify pgvector extension status',
          'Monitor search query patterns'
        ]
      })
    }

    // Auth correlation
    const authCheck = this.checks.find(c => c.endpoint.includes('/auth'))
    if (authCheck && authCheck.status !== 'healthy') {
      this.correlations.push({
        subsystem: 'Authentication',
        status: authCheck.status,
        dependencies: ['Database'], // Auth depends on DB for profiles
        rootCauseCandidates: [
          'Supabase Auth service degradation',
          'OAuth provider connectivity issues',
          'RLS policy misconfiguration',
          'Session management failures'
        ],
        recommendations: authCheck.data?.recommendations || [
          'Check Supabase Auth service status',
          'Verify OAuth provider configurations',
          'Review RLS policies for profiles table',
          'Check session management logs'
        ]
      })
    }
  }

  /**
   * Generate comprehensive diagnostic report
   */
  private generateReport(): void {
    console.log('🔬 HealthAI Diagnostic Report\n')
    console.log('═'.repeat(60))

    if (this.correlations.length === 0) {
      console.log('\n✅ All subsystems operating normally.')
      console.log('   No issues detected. System health is optimal.\n')
      return
    }

    // Group by severity
    const critical = this.correlations.filter(c => c.status === 'unhealthy')
    const warnings = this.correlations.filter(c => c.status === 'degraded')

    if (critical.length > 0) {
      console.log('\n🚨 CRITICAL ISSUES DETECTED\n')
      critical.forEach(corr => {
        console.log(`Subsystem: ${corr.subsystem}`)
        console.log(`Status: ${corr.status.toUpperCase()}`)
        console.log(`Affects: ${corr.dependencies.join(', ')}`)
        console.log('\nRoot Cause Candidates:')
        corr.rootCauseCandidates.forEach((cause, i) => {
          console.log(`  ${i + 1}. ${cause}`)
        })
        console.log('\nRecommended Next Steps:')
        corr.recommendations.forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`)
        })
        console.log('\n' + '─'.repeat(60) + '\n')
      })
    }

    if (warnings.length > 0) {
      console.log('⚠️  DEGRADED PERFORMANCE DETECTED\n')
      warnings.forEach(corr => {
        console.log(`Subsystem: ${corr.subsystem}`)
        console.log(`Status: ${corr.status.toUpperCase()}`)
        console.log(`Affects: ${corr.dependencies.join(', ')}`)
        console.log('\nRecommended Next Steps:')
        corr.recommendations.slice(0, 3).forEach((rec, i) => {
          console.log(`  ${i + 1}. ${rec}`)
        })
        console.log('\n' + '─'.repeat(60) + '\n')
      })
    }

    // Cross-subsystem correlation analysis
    if (this.correlations.length > 1) {
      console.log('🔗 Cross-Subsystem Correlation Analysis\n')
      
      // Check if DB issues are causing other problems
      const dbIssue = this.correlations.find(c => c.subsystem === 'Database')
      if (dbIssue && dbIssue.status !== 'healthy') {
        const affected = this.correlations.filter(c => 
          c.subsystem !== 'Database' && 
          c.dependencies.includes('Database')
        )
        if (affected.length > 0) {
          console.log('⚠️  Database issues may be cascading to:')
          affected.forEach(corr => {
            console.log(`   • ${corr.subsystem} (${corr.status})`)
          })
          console.log('\n   RECOMMENDATION: Address database issues first, as they may resolve')
          console.log('   downstream subsystem problems.\n')
        }
      }
    }

    console.log('═'.repeat(60))
    console.log('\n📋 Summary')
    console.log(`   Total Issues: ${this.correlations.length}`)
    console.log(`   Critical: ${critical.length}`)
    console.log(`   Warnings: ${warnings.length}`)
    console.log('\n💡 HealthAI Note: This is a diagnostic report only.')
    console.log('   No actions have been taken. Review recommendations above.\n')
  }

  /**
   * Get human-readable subsystem name from endpoint
   */
  private getSubsystemName(endpoint: string): string {
    if (endpoint.includes('/db')) return 'Database'
    if (endpoint.includes('/webhooks')) return 'Webhooks'
    if (endpoint.includes('/cache')) return 'Cache'
    if (endpoint.includes('/search')) return 'Search'
    if (endpoint.includes('/auth')) return 'Authentication'
    if (endpoint.includes('/health') && !endpoint.includes('/health/')) return 'Overall Health'
    return endpoint
  }
}

// Main execution
async function main() {
  const baseUrl = process.argv[2] || process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  
  const healthAI = new HealthAI(baseUrl)
  await healthAI.monitorAll()
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('❌ HealthAI monitoring failed:', error)
    process.exit(1)
  })
}

export { HealthAI }
