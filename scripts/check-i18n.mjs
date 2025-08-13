#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('locales')
const baseLocale = 'en-US'
const basePath = path.join(localesDir, `${baseLocale}.json`)
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))
const baseKeys = Object.keys(base)

let success = true

const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'))
const allKeys = new Set(baseKeys)

for (const file of localeFiles) {
  const locale = path.basename(file, '.json')
  const data = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
  const keys = Object.keys(data)

  // track keys not in base
  for (const k of keys) {
    if (!baseKeys.includes(k)) {
      console.error(`Key "${k}" in ${file} missing from ${baseLocale}.json`)
      success = false
    }
  }

  // coverage for locales other than base
  const present = keys.filter(k => baseKeys.includes(k))
  const coverage = (present.length / baseKeys.length) * 100
  console.log(`${locale}: ${coverage.toFixed(1)}%`)
  if (locale !== baseLocale && coverage < 95) {
    success = false
  }

  // accumulate keys to check base completeness
  keys.forEach(k => allKeys.add(k))
}

// check base completeness against union
for (const k of allKeys) {
  if (!baseKeys.includes(k)) {
    console.error(`Base locale ${baseLocale} missing key "${k}"`)
    success = false
  }
}

if (!success) {
  process.exit(1)
}
console.log('Locale coverage check passed')
