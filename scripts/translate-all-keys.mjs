#!/usr/bin/env node
/**
 * Convenience script to translate ALL missing and untranslated keys
 * This is a wrapper around translate-missing-keys.mjs with --all flag
 */

import { spawn } from 'child_process'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const scriptPath = path.join(__dirname, 'translate-missing-keys.mjs')
const args = process.argv.slice(2)

// Add --all flag to translate both missing and untranslated keys
const allArgs = ['--all', ...args]

console.log('🚀 Translating all missing and untranslated keys...\n')

const child = spawn('node', [scriptPath, ...allArgs], {
  stdio: 'inherit',
  shell: true
})

child.on('close', (code) => {
  process.exit(code || 0)
})




