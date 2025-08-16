#!/usr/bin/env node
import { validateEnv } from '../src/lib/security/envValidator.js'

try {
  validateEnv(process.env)
  console.log('ENV OK')
  process.exit(0)
} catch (e) {
  console.error('ENV INVALID:', e?.errors || e?.message || e)
  process.exit(1)
}


