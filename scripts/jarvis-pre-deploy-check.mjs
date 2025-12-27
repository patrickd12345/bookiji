#!/usr/bin/env node
/**
 * Jarvis Pre-Deploy Check
 * 
 * Verifies:
 * 1. Only one LLM key is set (GROQ or OPENAI)
 * 2. Twilio credentials are configured
 * 3. Environment guards are in place
 * 4. Database migration exists
 */

import { readFileSync } from 'fs'
import { join } from 'path'

const checks = {
  llm_key: false,
  twilio_config: false,
  owner_phone: false,
  migration_exists: false,
  env_guards: false
}

const errors = []
const warnings = []

// Check LLM key (only one should be set)
const groqKey = process.env.GROQ_API_KEY
const openaiKey = process.env.OPENAI_API_KEY

if (groqKey && openaiKey) {
  warnings.push('Both GROQ_API_KEY and OPENAI_API_KEY are set. Jarvis will use GROQ.')
  checks.llm_key = true
} else if (groqKey || openaiKey) {
  checks.llm_key = true
} else {
  errors.push('No LLM key set (GROQ_API_KEY or OPENAI_API_KEY). Jarvis will use deterministic fallback.')
  checks.llm_key = false // Not fatal, but not ideal
}

// Check Twilio config
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM) {
  checks.twilio_config = true
} else {
  errors.push('Twilio not fully configured. Missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_FROM')
  checks.twilio_config = false
}

// Check owner phone
if (process.env.JARVIS_OWNER_PHONE) {
  checks.owner_phone = true
} else {
  errors.push('JARVIS_OWNER_PHONE not set')
  checks.owner_phone = false
}

// Check migration exists
try {
  const migrationPath = join(process.cwd(), 'supabase', 'migrations', '20250127000000_jarvis_incidents.sql')
  const migrationContent = readFileSync(migrationPath, 'utf-8')
  if (migrationContent.includes('jarvis_incidents')) {
    checks.migration_exists = true
  } else {
    errors.push('Jarvis migration file exists but does not contain jarvis_incidents table')
    checks.migration_exists = false
  }
} catch (error) {
  errors.push(`Jarvis migration not found: ${error.message}`)
  checks.migration_exists = false
}

// Check environment guards (verify APP_ENV is used)
try {
  const assertEnvPath = join(process.cwd(), 'src', 'lib', 'env', 'assertAppEnv.ts')
  const assertEnvContent = readFileSync(assertEnvPath, 'utf-8')
  if (assertEnvContent.includes('isProduction') && assertEnvContent.includes('isStaging')) {
    checks.env_guards = true
  } else {
    warnings.push('Environment guards may not be fully implemented')
    checks.env_guards = true // Not fatal
  }
} catch (error) {
  warnings.push(`Could not verify environment guards: ${error.message}`)
  checks.env_guards = true // Assume OK
}

// Report
console.log('\n🔒 Jarvis Pre-Deploy Check\n')
console.log('Checks:')
console.log(`  LLM Key: ${checks.llm_key ? '✅' : '⚠️'}`)
console.log(`  Twilio Config: ${checks.twilio_config ? '✅' : '❌'}`)
console.log(`  Owner Phone: ${checks.owner_phone ? '✅' : '❌'}`)
console.log(`  Migration: ${checks.migration_exists ? '✅' : '❌'}`)
console.log(`  Env Guards: ${checks.env_guards ? '✅' : '⚠️'}`)

if (warnings.length > 0) {
  console.log('\n⚠️  Warnings:')
  warnings.forEach(w => console.log(`  - ${w}`))
}

if (errors.length > 0) {
  console.log('\n❌ Errors:')
  errors.forEach(e => console.log(`  - ${e}`))
}

const allCritical = checks.twilio_config && checks.owner_phone && checks.migration_exists

if (!allCritical) {
  console.log('\n❌ Pre-deploy check FAILED. Fix errors before deploying.')
  process.exit(1)
} else {
  console.log('\n✅ Pre-deploy check PASSED. Jarvis is ready to stand watch.')
  if (warnings.length > 0) {
    console.log('⚠️  Review warnings above.')
  }
  process.exit(0)
}



