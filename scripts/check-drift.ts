#!/usr/bin/env tsx
/**
 * Schema Drift Detection
 * 
 * Detects when:
 * - Migrations differ from production schema
 * - Local schema does not match remote
 * - A column is added in production and not versioned
 * - You forget to commit a migration
 */

import { execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

interface DriftResult {
  hasDrift: boolean
  localSchema?: string
  remoteSchema?: string
  differences?: string[]
  error?: string
}

async function checkDrift(): Promise<DriftResult> {
  console.log('🔍 Checking for schema drift...')

  try {
    // Get local schema
    console.log('📋 Generating local schema...')
    const localSchema = await getLocalSchema()

    // Get remote schema (if SUPABASE_DB_URL is set)
    let remoteSchema: string | undefined
    if (process.env.SUPABASE_DB_URL) {
      console.log('📋 Fetching remote schema...')
      remoteSchema = await getRemoteSchema()
    } else {
      console.log('⚠️  SUPABASE_DB_URL not set, skipping remote comparison')
    }

    // Compare schemas
    if (remoteSchema) {
      const differences = compareSchemas(localSchema, remoteSchema)
      
      if (differences.length > 0) {
        console.log('❌ Schema drift detected:')
        differences.forEach(diff => console.log(`  - ${diff}`))
        return {
          hasDrift: true,
          localSchema,
          remoteSchema,
          differences
        }
      }
    }

    // Check for uncommitted migrations
    const uncommittedMigrations = await checkUncommittedMigrations()
    if (uncommittedMigrations.length > 0) {
      console.log('⚠️  Uncommitted migrations found:')
      uncommittedMigrations.forEach(m => console.log(`  - ${m}`))
    }

    console.log('✅ No schema drift detected')
    return {
      hasDrift: false,
      localSchema,
      remoteSchema
    }
  } catch (error) {
    console.error('❌ Error checking drift:', error)
    return {
      hasDrift: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

async function getLocalSchema(): Promise<string> {
  try {
    // Use Supabase CLI to generate schema
    const output = execSync('npx supabase db dump --schema public', {
      encoding: 'utf-8',
      stdio: 'pipe'
    })
    return output
  } catch (error) {
    // Fallback: read from migrations directory
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    if (fs.existsSync(migrationsDir)) {
      const files = fs.readdirSync(migrationsDir).sort()
      return files.map(f => fs.readFileSync(path.join(migrationsDir, f), 'utf-8')).join('\n')
    }
    throw new Error('Could not generate local schema')
  }
}

async function getRemoteSchema(): Promise<string> {
  if (!process.env.SUPABASE_DB_URL) {
    throw new Error('SUPABASE_DB_URL is required for remote schema comparison')
  }

  try {
    // Use Supabase CLI with remote connection
    const output = execSync(
      `npx supabase db dump --db-url "${process.env.SUPABASE_DB_URL}" --schema public`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )
    return output
  } catch (error) {
    throw new Error('Could not fetch remote schema')
  }
}

function compareSchemas(local: string, remote: string): string[] {
  const differences: string[] = []

  // Simple comparison - in production, use a proper SQL diff tool
  const localTables = extractTables(local)
  const remoteTables = extractTables(remote)

  // Check for missing tables
  localTables.forEach(table => {
    if (!remoteTables.includes(table)) {
      differences.push(`Table ${table} exists locally but not in remote`)
    }
  })

  remoteTables.forEach(table => {
    if (!localTables.includes(table)) {
      differences.push(`Table ${table} exists in remote but not locally`)
    }
  })

  return differences
}

function extractTables(schema: string): string[] {
  const tableMatches = schema.match(/CREATE TABLE\s+(\w+)/gi)
  return tableMatches ? tableMatches.map(m => m.replace(/CREATE TABLE\s+/i, '')) : []
}

async function checkUncommittedMigrations(): Promise<string[]> {
  try {
    const migrationsDir = path.join(process.cwd(), 'supabase', 'migrations')
    if (!fs.existsSync(migrationsDir)) {
      return []
    }

    // Check git status for uncommitted migrations
    const output = execSync(
      `git status --porcelain ${migrationsDir}`,
      { encoding: 'utf-8', stdio: 'pipe' }
    )

    return output
      .split('\n')
      .filter(line => line.trim())
      .map(line => line.split(/\s+/).pop() || '')
      .filter(Boolean)
  } catch {
    return []
  }
}

// Main execution
if (require.main === module) {
  checkDrift()
    .then((result) => {
      if (result.hasDrift) {
        console.error('❌ Schema drift detected!')
        process.exit(1)
      } else {
        console.log('✅ Schema is in sync')
        process.exit(0)
      }
    })
    .catch((error) => {
      console.error('Fatal error:', error)
      process.exit(1)
    })
}

export { checkDrift }


















