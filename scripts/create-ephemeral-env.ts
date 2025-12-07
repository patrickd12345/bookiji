#!/usr/bin/env tsx
/**
 * Create Full Ephemeral Environment
 * 
 * Sets up complete logical environment for PR testing including:
 * - Database schema (via prepare-ephemeral-db.ts)
 * - Environment identifiers
 * - Base URLs
 * - Optional Redis namespaces
 */

import * as fs from 'fs'
import * as path from 'path'
import { prepareEphemeralDB } from './prepare-ephemeral-db'

interface EphemeralEnv {
  appEnv: string
  schemaName?: string
  baseUrl?: string
  redisNamespace?: string
  commitSha: string
  branch: string
  createdAt: string
}

/**
 * Derive environment identifiers
 */
function deriveEnvironmentIdentifiers(): {
  appEnv: string
  commitSha: string
  branch: string
} {
  const appEnv = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || 'main'
  const commitSha = process.env.GITHUB_SHA || process.env.CI_COMMIT_SHA || 'unknown'
  const branch = process.env.GITHUB_REF_NAME || process.env.CI_COMMIT_REF_NAME || 'main'

  return { appEnv, commitSha, branch }
}

/**
 * Generate base URL for ephemeral environment
 */
function generateBaseUrl(appEnv: string, branch: string): string | undefined {
  // For PRs, use Vercel preview URL pattern
  if (appEnv.startsWith('pr_')) {
    const prNumber = appEnv.replace('pr_', '')
    return `https://pr-${prNumber}.bookiji.com`
  }

  // For branches, use branch name
  if (branch !== 'main') {
    const sanitized = branch.replace(/[^a-zA-Z0-9-]/g, '-').toLowerCase()
    return `https://${sanitized}.bookiji.com`
  }

  // For main, use production
  return 'https://www.bookiji.com'
}

/**
 * Generate Redis namespace (if Redis is used)
 */
function generateRedisNamespace(appEnv: string): string | undefined {
  // Stub: if Redis is used, namespace by environment
  // For now, just log that it would be namespaced
  if (appEnv.startsWith('pr_')) {
    return `bookiji:${appEnv}`
  }
  return undefined
}

/**
 * Create ephemeral environment
 */
async function createEphemeralEnv(): Promise<EphemeralEnv> {
  console.log('🔧 Creating ephemeral environment...')

  const { appEnv, commitSha, branch } = deriveEnvironmentIdentifiers()
  console.log(`📦 Environment: ${appEnv}`)
  console.log(`🔖 Commit: ${commitSha.substring(0, 7)}`)
  console.log(`🌿 Branch: ${branch}`)

  // Prepare database schema
  let schemaName: string | undefined
  try {
    const dbResult = await prepareEphemeralDB()
    schemaName = dbResult.schemaName
    if (schemaName) {
      console.log(`✅ Database schema: ${schemaName}`)
    }
  } catch (error) {
    console.warn('⚠️  Database preparation failed:', error)
  }

  // Generate base URL
  const baseUrl = generateBaseUrl(appEnv, branch)
  if (baseUrl) {
    console.log(`🌐 Base URL: ${baseUrl}`)
  }

  // Generate Redis namespace (stub)
  const redisNamespace = generateRedisNamespace(appEnv)
  if (redisNamespace) {
    console.log(`🔴 Redis namespace: ${redisNamespace}`)
  } else {
    console.log('ℹ️  Redis not configured for this environment')
  }

  const env: EphemeralEnv = {
    appEnv,
    schemaName,
    baseUrl,
    redisNamespace,
    commitSha,
    branch,
    createdAt: new Date().toISOString(),
  }

  // Write environment descriptor
  const descriptorsDir = path.join(process.cwd(), 'env-descriptors')
  if (!fs.existsSync(descriptorsDir)) {
    fs.mkdirSync(descriptorsDir, { recursive: true })
  }

  const descriptorPath = path.join(descriptorsDir, `${appEnv}.json`)
  fs.writeFileSync(descriptorPath, JSON.stringify(env, null, 2))
  console.log(`✅ Environment descriptor written to: ${descriptorPath}`)

  // Also write to .ephemeral-env.json for app consumption
  const envFile = path.join(process.cwd(), '.ephemeral-env.json')
  fs.writeFileSync(envFile, JSON.stringify(env, null, 2))
  console.log(`✅ Environment config written to: ${envFile}`)

  return env
}

/**
 * Main execution
 */
async function main() {
  try {
    const env = await createEphemeralEnv()
    
    console.log('\n✅ Ephemeral environment created successfully')
    console.log(`   Environment: ${env.appEnv}`)
    if (env.baseUrl) {
      console.log(`   URL: ${env.baseUrl}`)
    }
    if (env.schemaName) {
      console.log(`   Schema: ${env.schemaName}`)
    }
    
    process.exit(0)
  } catch (error) {
    console.error('❌ Failed to create ephemeral environment:', error)
    // Don't fail CI - environments are optional
    process.exit(0)
  }
}

if (require.main === module) {
  main()
}

export { createEphemeralEnv, type EphemeralEnv }
