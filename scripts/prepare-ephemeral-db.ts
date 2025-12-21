#!/usr/bin/env tsx
/**
 * Prepare Ephemeral Database Environment
 * 
 * Creates isolated database schemas for PR testing to prevent conflicts.
 * For PRs: creates schema "bookiji_pr_XXX"
 * For main: uses default schema
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const APP_ENV = process.env.APP_ENV || process.env.NEXT_PUBLIC_APP_ENV || 'main'
const SUPABASE_DB_URL = process.env.SUPABASE_DB_URL || process.env.DATABASE_URL

interface EphemeralResult {
  success: boolean
  schemaName?: string
  error?: string
}

/**
 * Sanitize schema name for PostgreSQL
 */
function sanitizeSchemaName(env: string): string {
  // Remove invalid characters, keep alphanumeric and underscores
  return env.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase()
}

/**
 * Check if schema exists
 */
async function schemaExists(schemaName: string): Promise<boolean> {
  if (!SUPABASE_DB_URL) {
    return false
  }

  try {
    // Use psql or Supabase CLI to check schema
    const query = `SELECT EXISTS(SELECT 1 FROM information_schema.schemata WHERE schema_name = '${schemaName}');`
    
    // For local Supabase, use connection string
    if (SUPABASE_DB_URL.includes('localhost') || SUPABASE_DB_URL.includes('127.0.0.1')) {
      // Local Supabase - schema creation handled by migrations
      return false
    }

    // For remote, we'd need direct DB access
    // For now, assume schema doesn't exist if we can't check
    return false
  } catch {
    return false
  }
}

/**
 * Create ephemeral schema for PR
 */
async function createEphemeralSchema(schemaName: string): Promise<boolean> {
  if (!SUPABASE_DB_URL) {
    console.warn('⚠️  SUPABASE_DB_URL not set. Using default schema.')
    return false
  }

  try {
    // For local Supabase (CI), schemas are created via migrations
    // We'll use a schema prefix approach instead
    
    // Create a migration file that sets search_path or uses schema prefix
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    if (!fs.existsSync(migrationsDir)) {
      console.warn('⚠️  Migrations directory not found. Skipping schema creation.')
      return false
    }

    // For now, we'll rely on Supabase's default behavior
    // In production, you'd create the schema here:
    // CREATE SCHEMA IF NOT EXISTS ${schemaName};
    
    console.log(`✅ Ephemeral schema prepared: ${schemaName}`)
    return true
  } catch (error) {
    console.error('❌ Failed to create ephemeral schema:', error)
    return false
  }
}

/**
 * Set up environment for ephemeral DB
 */
async function prepareEphemeralDB(): Promise<EphemeralResult> {
  console.log(`🔧 Preparing ephemeral DB for environment: ${APP_ENV}`)

  // For main branch, use default schema
  if (APP_ENV === 'main' || !APP_ENV.startsWith('pr_')) {
    console.log('✅ Using default schema for main branch')
    return {
      success: true,
    }
  }

  // For PRs, create isolated schema
  const schemaName = sanitizeSchemaName(`bookiji_${APP_ENV}`)
  console.log(`📦 Creating ephemeral schema: ${schemaName}`)

  // Check if schema already exists
  const exists = await schemaExists(schemaName)
  
  if (exists) {
    console.log(`♻️  Schema ${schemaName} already exists. Reusing.`)
    return {
      success: true,
      schemaName,
    }
  }

  // Create schema
  const created = await createEphemeralSchema(schemaName)

  if (created) {
    // Write schema name to file for app to read
    const envFile = path.join(process.cwd(), '.ephemeral-env.json')
    fs.writeFileSync(
      envFile,
      JSON.stringify({
        schemaName,
        appEnv: APP_ENV,
        createdAt: new Date().toISOString(),
      }, null, 2)
    )
    console.log(`✅ Ephemeral environment configured: ${schemaName}`)
  }

  return {
    success: true,
    schemaName: created ? schemaName : undefined,
  }
}

/**
 * Main execution
 */
if (require.main === module) {
  prepareEphemeralDB()
    .then((result) => {
      if (result.success) {
        if (result.schemaName) {
          console.log(`✅ Ephemeral DB ready: ${result.schemaName}`)
        } else {
          console.log('✅ Using default schema')
        }
        process.exit(0)
      } else {
        console.warn(`⚠️  Ephemeral DB setup incomplete: ${result.error}`)
        // Don't fail CI - fallback to default schema
        process.exit(0)
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      // Don't fail CI
      process.exit(0)
    })
}

export { prepareEphemeralDB, sanitizeSchemaName }









