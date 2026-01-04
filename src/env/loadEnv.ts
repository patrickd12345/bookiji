import { config } from 'dotenv'
import path from 'path'
import fs from 'fs'
import { RuntimeMode } from './types'

export { RuntimeMode } from './types'

export const loadEnvFile = (mode: RuntimeMode) => {
  const envFiles: Record<RuntimeMode, string[]> = {
    dev: ['.env.dev', '.env.development'],
    e2e: ['.env.e2e', 'scripts/e2e/env.e2e'],
    staging: ['.env.staging'],
    prod: ['.env.prod', '.env.production']
  }

  const files = envFiles[mode] || []
  const found = files.find(f => fs.existsSync(f))

  if (found) {
    console.log(`Loading env from ${found}`)
    return config({ path: found })
  }

  // If no specific file found, try loading .env as fallback
  if (fs.existsSync('.env')) {
     console.log('Loading env from .env')
     return config({ path: '.env' })
  }

  // If we are in e2e mode and strict about it, we might want to throw or log warning
  if (mode === 'e2e') {
     console.warn('Warning: No specific e2e env file found.')
  }

  return { parsed: {} }
}
