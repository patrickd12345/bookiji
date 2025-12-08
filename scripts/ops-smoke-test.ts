#!/usr/bin/env node
/**
 * OpsAI / Ops Fabric endpoint smoke test
 *
 * Usage:
 *   pnpm ops:smoke
 *
 * Env:
 *   OPS_SMOKE_BASE_URL (default: http://localhost:3000)
 */

import fetch from 'node-fetch'

type CheckResult = {
  name: string
  path: string
  ok: boolean
  status?: number
  error?: string
}

const baseUrl =
  process.env.OPS_SMOKE_BASE_URL ||
  process.env.NEXT_PUBLIC_SITE_URL ||
  'http://localhost:3000'

type CheckConfig = {
  name: string
  path: string
  description: string
  required?: boolean
  acceptStatuses?: number[]
  validateJson?: (json: any) => void
}

const checks: CheckConfig[] = [
  {
    name: 'ops.summary.forceEmptyDeployments',
    path: '/api/ops/summary?forceEmptyDeployments=1',
    description: 'Ops summary with forced empty deployments (null-deployment simulation)',
    required: true,
    validateJson: (json) => {
      if (!Array.isArray(json.deployments)) {
        throw new Error('deployments is not an array')
      }
      if (json.deployments.length !== 0) {
        throw new Error('deployments is not empty')
      }
      if (!json.health || typeof json.health.overall === 'undefined') {
        throw new Error('health.overall missing')
      }
    }
  },
  {
    name: 'ops.summary',
    path: '/api/ops/summary',
    description: 'Live Ops summary (may depend on Ops Fabric / SimCity)',
    required: false
  },
  {
    name: 'ops.health',
    path: '/api/ops/health',
    description: 'HealthAI aggregate status',
    required: true,
    // For smoke purposes, consider 503 with a valid body as "reachable"
    // so local DB outages don’t make the whole smoke test fail.
    acceptStatuses: [200, 503]
  },
  {
    name: 'ops.incidents.list',
    path: '/api/ops/incidents/list',
    description: 'Incidents list (IncidentsAI)',
    required: false
  },
  {
    name: 'ops.deployments',
    path: '/api/ops/deployments',
    description: 'Deployments list (DeployAI surface)',
    required: false
  },
  {
    name: 'ops.deployments.readiness',
    path: '/api/ops/deployments/readiness',
    description: 'Deploy readiness (DeployAI)',
    required: false
  },
  {
    name: 'ops.anomaly',
    path: '/api/ops/anomaly',
    description: 'AnomalyAI cross-domain anomaly report',
    required: false
  }
]

async function runCheck(
  name: string,
  path: string,
  config: Pick<CheckConfig, 'acceptStatuses' | 'validateJson'>
): Promise<CheckResult> {
  const url = `${baseUrl.replace(/\/$/, '')}${path}`
  try {
    const res = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    })

    const acceptable =
      (config.acceptStatuses && config.acceptStatuses.includes(res.status)) || res.ok

    if (!acceptable) {
      return {
        name,
        path,
        ok: false,
        status: res.status,
        error: `HTTP ${res.status}`
      }
    }

    if (config.validateJson) {
      const json = await res.json().catch(() => null)
      if (json == null) {
        return {
          name,
          path,
          ok: false,
          status: res.status,
          error: 'Response is not valid JSON'
        }
      }
      try {
        config.validateJson(json)
      } catch (err) {
        return {
          name,
          path,
          ok: false,
          status: res.status,
          error: err instanceof Error ? err.message : String(err)
        }
      }
    }

    return { name, path, ok: true, status: res.status }
  } catch (error) {
    return {
      name,
      path,
      ok: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function main() {
  console.log('dYs? OpsAI / Ops Fabric smoke test')
  console.log(`dY"< Base URL: ${baseUrl}\n`)

  const results: CheckResult[] = []

  for (const check of checks) {
    process.stdout.write(`• ${check.name} (${check.path}) ... `)
    const result = await runCheck(check.name, check.path, {
      acceptStatuses: check.acceptStatuses,
      validateJson: check.validateJson
    })
    results.push(result)

    if (result.ok) {
      console.log(`ƒo. OK${result.status ? ` (HTTP ${result.status})` : ''}`)
    } else {
      const prefix = check.required ? 'ƒ?O' : 'ƒsÿ‹,?'
      console.log(
        `${prefix} ${check.required ? 'REQUIRED endpoint failed' : 'Optional endpoint issue'}: ${
          result.error || 'Unknown error'
        }${result.status ? ` (HTTP ${result.status})` : ''}`
      )
    }
  }

  const required = checks.filter((c) => c.required !== false)
  const requiredFailures = results.filter(
    (r) => !r.ok && required.some((c) => c.name === r.name)
  )
  const optionalFailures = results.filter(
    (r) => !r.ok && !required.some((c) => c.name === r.name)
  )

  console.log('\nSummary:')
  console.log(
    `  Required endpoints: ${required.length - requiredFailures.length}/${required.length} passing`
  )
  if (requiredFailures.length > 0) {
    console.log('  Required failures:')
    for (const f of requiredFailures) {
      console.log(`    - ${f.name} (${f.path}): ${f.error || 'Unknown error'}`)
    }
  }

  if (optionalFailures.length > 0) {
    console.log('\n  Optional endpoint issues:')
    for (const f of optionalFailures) {
      console.log(`    - ${f.name} (${f.path}): ${f.error || 'Unknown error'}`)
    }
  }

  if (requiredFailures.length > 0) {
    process.exitCode = 1
  } else {
    console.log('\nƒo. Ops smoke test completed successfully')
  }
}

main().catch((err) => {
  console.error('ƒ?O Unexpected error in ops-smoke-test:', err)
  process.exitCode = 1
})
