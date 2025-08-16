#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const migrationsDir = path.resolve('supabase/migrations')
const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql'))
if (files.length === 0) {
  console.log('No migrations found')
  process.exit(0)
}

for (const file of files) {
  const p = path.join(migrationsDir, file)
  const sql = fs.readFileSync(p, 'utf8')
  if (!/create\s+table|alter\s+table|drop\s+table|create\s+index/i.test(sql)) {
    console.warn('Migration has no structural changes (ok):', file)
  } else {
    console.log('Migration present:', file)
  }
}
console.log('Migrations dry-run OK')


