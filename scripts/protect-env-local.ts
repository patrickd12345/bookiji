#!/usr/bin/env tsx
/**
 * Protect .env.local
 * 
 * Restores .env.local from .env.local.bak if it's missing.
 * Useful when cloud environments reset or git clean removes it.
 */

import fs from 'node:fs'
import path from 'node:path'

const envLocalPath = path.resolve(process.cwd(), '.env.local')
const envLocalBakPath = path.resolve(process.cwd(), '.env.local.bak')

if (!fs.existsSync(envLocalPath) && fs.existsSync(envLocalBakPath)) {
  console.log('⚠️  .env.local is missing, restoring from .env.local.bak...')
  fs.copyFileSync(envLocalBakPath, envLocalPath)
  console.log('✅ Restored .env.local from backup')
} else if (fs.existsSync(envLocalPath)) {
  console.log('✅ .env.local exists')
} else {
  console.log('⚠️  .env.local not found and no backup available')
  console.log('   Create .env.local or copy from .env.local.bak manually')
}










