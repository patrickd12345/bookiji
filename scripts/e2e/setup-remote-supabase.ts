#!/usr/bin/env tsx
/**
 * Remote Supabase E2E Setup Helper
 * 
 * Interactive script to configure remote Supabase for cloud E2E testing.
 * Helps set up .env.e2e with remote Supabase credentials.
 * 
 * Usage:
 *   pnpm tsx scripts/e2e/setup-remote-supabase.ts
 */

import { readFileSync, writeFileSync, existsSync } from 'fs'
import { resolve } from 'path'
import { createInterface } from 'readline'

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
})

function question(query: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(query, resolve)
  })
}

function updateEnvFile(envPath: string, updates: Record<string, string>) {
  let content = ''
  
  if (existsSync(envPath)) {
    content = readFileSync(envPath, 'utf-8')
  }
  
  const lines = content.split('\n')
  const newLines: string[] = []
  const updatedKeys = new Set<string>()
  
  // Update existing keys
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) {
      newLines.push(line)
      continue
    }
    
    const match = trimmed.match(/^([^=]+)=(.*)$/)
    if (match) {
      const key = match[1].trim()
      if (updates[key]) {
        newLines.push(`${key}=${updates[key]}`)
        updatedKeys.add(key)
        continue
      }
    }
    
    newLines.push(line)
  }
  
  // Add new keys
  for (const [key, value] of Object.entries(updates)) {
    if (!updatedKeys.has(key)) {
      newLines.push(`${key}=${value}`)
    }
  }
  
  writeFileSync(envPath, newLines.join('\n') + '\n', 'utf-8')
}

async function main() {
  console.log('🌐 Remote Supabase E2E Setup\n')
  console.log('This script will help you configure .env.e2e for cloud E2E testing.\n')
  console.log('You will need:')
  console.log('  - Supabase project URL (e.g., https://xxxxx.supabase.co)')
  console.log('  - Anon/public API key')
  console.log('  - Service role API key (from Project API keys)\n')
  
  const proceed = await question('Continue? (y/n): ')
  if (proceed.toLowerCase() !== 'y') {
    console.log('Cancelled.')
    rl.close()
    return
  }
  
  console.log('\n📋 Gathering configuration...\n')
  
  const supabaseUrl = await question('Supabase Project URL: ')
  if (!supabaseUrl || !supabaseUrl.startsWith('https://')) {
    console.error('❌ Invalid Supabase URL. Must start with https://')
    rl.close()
    process.exit(1)
  }
  
  const anonKey = await question('Anon/Public API Key: ')
  if (!anonKey) {
    console.error('❌ Anon key is required')
    rl.close()
    process.exit(1)
  }
  
  const serviceRoleKey = await question('Service Role API Key: ')
  if (!serviceRoleKey) {
    console.error('❌ Service role key is required')
    rl.close()
    process.exit(1)
  }
  
  const baseUrl = await question('Base URL for tests [http://localhost:3000]: ') || 'http://localhost:3000'
  
  console.log('\n✅ Configuration gathered!\n')
  console.log('Updating .env.e2e...')
  
  const envPath = resolve(process.cwd(), '.env.e2e')
  const updates: Record<string, string> = {
    'E2E_ALLOW_REMOTE_SUPABASE': 'true',
    'SUPABASE_URL': supabaseUrl,
    'NEXT_PUBLIC_SUPABASE_URL': supabaseUrl,
    'SUPABASE_ANON_KEY': anonKey,
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY': anonKey,
    'SUPABASE_SECRET_KEY': serviceRoleKey,
    'SUPABASE_SERVICE_ROLE_KEY': serviceRoleKey,
    'E2E_BASE_URL': baseUrl,
    'BASE_URL': baseUrl,
    'E2E': 'true',
    'NEXT_PUBLIC_E2E': 'true',
  }
  
  // Preserve existing test credentials if they exist
  const existingContent = existsSync(envPath) ? readFileSync(envPath, 'utf-8') : ''
  const credentialKeys = [
    'E2E_VENDOR_EMAIL',
    'E2E_VENDOR_PASSWORD',
    'E2E_CUSTOMER_EMAIL',
    'E2E_CUSTOMER_PASSWORD',
    'E2E_ADMIN_EMAIL',
    'E2E_ADMIN_PASSWORD',
    'CREATE_ADMIN',
  ]
  
  for (const key of credentialKeys) {
    const match = existingContent.match(new RegExp(`^${key}=(.+)$`, 'm'))
    if (match) {
      updates[key] = match[1].trim()
    }
  }
  
  // Set defaults for credentials if not present
  if (!updates['E2E_VENDOR_EMAIL']) {
    updates['E2E_VENDOR_EMAIL'] = 'e2e-vendor@bookiji.test'
  }
  if (!updates['E2E_VENDOR_PASSWORD']) {
    updates['E2E_VENDOR_PASSWORD'] = 'TestPassword123!'
  }
  if (!updates['E2E_CUSTOMER_EMAIL']) {
    updates['E2E_CUSTOMER_EMAIL'] = 'e2e-customer@bookiji.test'
  }
  if (!updates['E2E_CUSTOMER_PASSWORD']) {
    updates['E2E_CUSTOMER_PASSWORD'] = 'password123'
  }
  if (!updates['E2E_ADMIN_EMAIL']) {
    updates['E2E_ADMIN_EMAIL'] = 'e2e-admin@bookiji.test'
  }
  if (!updates['E2E_ADMIN_PASSWORD']) {
    updates['E2E_ADMIN_PASSWORD'] = 'TestPassword123!'
  }
  if (!updates['CREATE_ADMIN']) {
    updates['CREATE_ADMIN'] = 'true'
  }
  
  updateEnvFile(envPath, updates)
  
  console.log('✅ .env.e2e updated successfully!\n')
  console.log('📝 Next steps:')
  console.log('  1. Verify your Supabase project has the latest migrations applied')
  console.log('  2. Run: pnpm tsx scripts/e2e/check-prerequisites.ts')
  console.log('  3. Run: pnpm e2e:seed (to create test users)')
  console.log('  4. Run: pnpm e2e (to run E2E tests)\n')
  console.log('⚠️  Security reminder: Never commit .env.e2e with real credentials!')
  console.log('   Use environment variables or secrets management in CI/CD.\n')
  
  rl.close()
}

main().catch((error) => {
  console.error('❌ Error:', error)
  rl.close()
  process.exit(1)
})
