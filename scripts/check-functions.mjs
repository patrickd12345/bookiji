#!/usr/bin/env node
/**
 * Introspect public functions
 */

import pg from 'pg'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const rootDir = join(__dirname, '..')

// Load .env.local
const envFile = join(rootDir, '.env.local')
const envContent = readFileSync(envFile, 'utf-8')

let databaseUrl = null

envContent.split('\n').forEach(line => {
  if (line.startsWith('DATABASE_URL=')) {
    databaseUrl = line.split('=')[1].trim()
  }
})

if (!databaseUrl) {
  console.error('Missing DATABASE_URL in .env.local')
  process.exit(1)
}

const client = new pg.Client({ connectionString: databaseUrl })

async function main() {
  try {
    await client.connect()
    
    const res = await client.query(`
      SELECT proname
      FROM pg_proc 
      JOIN pg_namespace ON pg_proc.pronamespace = pg_namespace.oid 
      WHERE pg_namespace.nspname = 'public'
      AND (
        proname ILIKE '%user%' OR 
        proname ILIKE '%auth%' OR 
        proname ILIKE '%hook%' OR
        proname ILIKE '%handle%'
      )
    `)
    
    console.log('SUSPICIOUS FUNCTIONS:')
    console.table(res.rows)
    
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

main()

