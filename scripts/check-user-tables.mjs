#!/usr/bin/env node
/**
 * Introspect app_users and user_roles columns
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
      SELECT table_name, column_name, data_type 
      FROM information_schema.columns 
      WHERE table_name IN ('app_users', 'user_roles')
      ORDER BY table_name, ordinal_position;
    `)
    
    console.log('TABLE COLUMNS:')
    console.table(res.rows)
    
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

main()

