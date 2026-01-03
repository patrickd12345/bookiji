#!/usr/bin/env node
import fs from 'fs'
import path from 'path'

const ROOT = path.resolve(process.cwd())
const IGNORED = ['node_modules', '.git', 'dist', 'build']

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const e of entries) {
    const full = path.join(dir, e.name)
    if (IGNORED.includes(e.name)) continue
    if (e.isDirectory()) walk(full)
    else {
      const ext = path.extname(e.name).toLowerCase()
      if (!['.ts', '.tsx', '.js', '.mjs', '.md', '.json', '.env', '.txt'].includes(ext) && !e.name.includes('Dockerfile')) return
      try {
        let s = fs.readFileSync(full, 'utf8')
        const original = s
        // Replace env variable name
        s = s.replace(/\bSUPABASE_SERVICE_ROLE_KEY\b/g, 'SUPABASE_SECRET_KEY')
        // Replace references in comments or docs that instruct the old name
        s = s.replace(/SUPABASE_SERVICE_ROLE_KEY/g, 'SUPABASE_SECRET_KEY')
        if (s !== original) {
          fs.writeFileSync(full, s, 'utf8')
          console.log(`Updated: ${path.relative(ROOT, full)}`)
        }
      } catch (err) {
        console.warn('Skipped', full, err.message)
      }
    }
  }
}

console.log('Replacing SUPABASE_SERVICE_ROLE_KEY -> SUPABASE_SECRET_KEY across repository...')
walk(ROOT)
console.log('Done.')

