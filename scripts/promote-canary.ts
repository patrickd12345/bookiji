#!/usr/bin/env tsx
/**
 * Promote Canary to Production
 * 
 * Promotes a successfully tested canary version to production.
 * Only call this after canary smoke tests pass.
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const CANARY_VERSION = process.env.CANARY_VERSION
const DEPLOY_TARGET = process.env.DEPLOY_TARGET || 'vercel'

interface PromoteResult {
  success: boolean
  productionUrl?: string
  error?: string
}

async function promoteCanary(): Promise<PromoteResult> {
  console.log(`🎯 Promoting canary to production: ${CANARY_VERSION}`)

  if (!CANARY_VERSION) {
    return {
      success: false,
      error: 'CANARY_VERSION environment variable is required'
    }
  }

  try {
    // Load canary info
    const canaryInfoPath = path.join(process.cwd(), '.canary.json')
    if (!fs.existsSync(canaryInfoPath)) {
      throw new Error('Canary info file not found. Deploy canary first.')
    }

    const canaryInfo = JSON.parse(fs.readFileSync(canaryInfoPath, 'utf-8'))

    if (canaryInfo.version !== CANARY_VERSION) {
      throw new Error(`Version mismatch: expected ${CANARY_VERSION}, got ${canaryInfo.version}`)
    }

    // Promote based on target
    if (DEPLOY_TARGET === 'vercel') {
      return await promoteVercel(canaryInfo)
    } else if (DEPLOY_TARGET === 'custom') {
      return await promoteCustom(canaryInfo)
    } else {
      throw new Error(`Unknown deploy target: ${DEPLOY_TARGET}`)
    }
  } catch (error) {
    console.error('❌ Promotion failed:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function promoteVercel(canaryInfo: any): Promise<PromoteResult> {
  try {
    // Promote Vercel deployment to QA (not production)
    // Note: QA is configured as the production branch in Vercel settings
    // This will deploy to the QA environment
    const output = execSync(
      `vercel deploy --prod --yes --token=${process.env.VERCEL_TOKEN}`,
      { encoding: 'utf-8' }
    )

    const urlMatch = output.match(/https:\/\/[^\s]+/)
    const qaUrl = urlMatch ? urlMatch[0] : 'https://www.bookiji.com'

    // Update canary info
    const promotedInfo = {
      ...canaryInfo,
      promotedAt: new Date().toISOString(),
      qaUrl,
      productionUrl: qaUrl // QA is currently the production environment
    }

    fs.writeFileSync(
      path.join(process.cwd(), '.canary.json'),
      JSON.stringify(promotedInfo, null, 2)
    )

    console.log(`✅ Canary promoted to QA: ${qaUrl}`)
    console.log(`ℹ️  Note: QA is currently configured as production in Vercel.`)
    console.log(`   To promote to actual production, change Vercel production branch from 'qa' to 'bookiji'`)
    return { success: true, productionUrl: qaUrl }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Vercel promotion failed'
    }
  }
}

async function promoteCustom(canaryInfo: any): Promise<PromoteResult> {
  // Custom promotion logic here
  console.log('⚠️  Custom promotion not implemented')
  return {
    success: false,
    error: 'Custom promotion not implemented'
  }
}

// Main execution
if (require.main === module) {
  promoteCanary()
    .then((result) => {
      if (result.success) {
        console.log(`✅ Promotion successful: ${result.productionUrl}`)
        process.exit(0)
      } else {
        console.error(`❌ Promotion failed: ${result.error}`)
        process.exit(1)
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { promoteCanary }



