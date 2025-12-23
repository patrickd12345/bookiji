#!/usr/bin/env tsx
/**
 * Deploy Canary Version
 * 
 * Deploys a canary version of the application for testing before production.
 * This script is used in CI/CD for safe deployments.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const CANARY_VERSION = process.env.CANARY_VERSION || `canary-${Date.now()}`
const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'vercel'

interface DeployResult {
  success: boolean
  canaryUrl?: string
  error?: string
}

async function deployCanary(): Promise<DeployResult> {
  console.log(`🚀 Deploying canary version: ${CANARY_VERSION}`)

  try {
    // Create canary build
    console.log('📦 Building canary version...')
    execSync('npm run build', { stdio: 'inherit' })

    // Deploy based on target
    if (DEPLOY_TARGET === 'vercel') {
      return await deployToVercel()
    } else if (DEPLOY_TARGET === 'custom') {
      return await deployCustom()
    } else {
      throw new Error(`Unknown deploy target: ${DEPLOY_TARGET}`)
    }
  } catch (error) {
    console.error('❌ Canary deployment failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function deployToVercel(): Promise<DeployResult> {
  try {
    // Deploy to Vercel preview
    const output = execSync(
      `vercel --prod=false --yes --token=${process.env.VERCEL_TOKEN}`,
      { encoding: 'utf-8' }
    )
    
    // Extract URL from Vercel output
    const urlMatch = output.match(/https:\/\/[^\s]+/)
    const canaryUrl = urlMatch ? urlMatch[0] : undefined

    if (!canaryUrl) {
      throw new Error('Could not extract canary URL from Vercel output')
    }

    // Store canary info
    const canaryInfo = {
      version: CANARY_VERSION,
      url: canaryUrl,
      deployedAt: new Date().toISOString(),
      commit: process.env.GITHUB_SHA || 'unknown'
    }

    fs.writeFileSync(
      path.join(process.cwd(), '.canary.json'),
      JSON.stringify(canaryInfo, null, 2)
    )

    console.log(`✅ Canary deployed: ${canaryUrl}`)
    return { success: true, canaryUrl }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vercel deployment failed'
    }
  }
}

async function deployCustom(): Promise<DeployResult> {
  // Custom deployment logic here
  // This is a placeholder for custom deployment targets
  console.log('⚠️  Custom deployment not implemented')
  return {
    success: false,
    error: 'Custom deployment not implemented'
  }
}

// Main execution
if (require.main === module) {
  deployCanary()
    .then((result) => {
      if (result.success) {
        console.log(`✅ Canary deployment successful: ${result.canaryUrl}`)
        process.exit(0)
      } else {
        console.error(`❌ Canary deployment failed: ${result.error}`)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { deployCanary, CANARY_VERSION }


















