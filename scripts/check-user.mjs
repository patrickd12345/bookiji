#!/usr/bin/env node
/**
 * Check if e2e-vendor exists in profiles
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
    
    console.log('Checking for e2e-vendor@bookiji.test...')
    
    const res = await client.query(`
      SELECT id, auth_user_id, email, role 
      FROM profiles 
      WHERE email = 'e2e-vendor@bookiji.test';
    `)
    
    if (res.rows.length === 0) {
      console.log('❌ User NOT FOUND in public.profiles')
    } else {
      console.log('✅ User FOUND in public.profiles:')
      console.table(res.rows)
    }
    
  } catch (err) {
    console.error(err)
  } finally {
    await client.end()
  }
}

main()

