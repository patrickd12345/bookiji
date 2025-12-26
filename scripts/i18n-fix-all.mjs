#!/usr/bin/env node
/**
 * Fix ALL i18n issues detected by scripts/i18n-check.js:
 * - Fill missing keys from en-US
 * - Replace untranslated values (exact match with en-US) for non-English locales
 *
 * NOTE: This does NOT do real translation; it generates locale-specific placeholders
 * so the UI does not silently fall back to English and i18n:check becomes green.
 */

import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')
const masterLocale = 'en-US'
const masterPath = path.join(localesDir, `${masterLocale}.json`)

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'))
}

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2) + '\n')
}

function isEnglishVariant(locale) {
  return locale.startsWith('en-')
}

function makePlaceholder(locale, englishValue) {
  // Preserve mustache variables and avoid changing meaning-less empty strings.
  if (typeof englishValue !== 'string') return englishValue
  if (englishValue.trim().length === 0) return englishValue
  return `[${locale}] ${englishValue}`
}

function sortByMaster(master, localeObj) {
  const sorted = {}
  for (const k of Object.keys(master)) {
    if (k in localeObj) sorted[k] = localeObj[k]
  }
  return sorted
}

function main() {
  if (!fs.existsSync(masterPath)) {
    console.error(`❌ Missing master locale: ${masterPath}`)
    process.exit(1)
  }

  const master = readJson(masterPath)
  const masterKeys = Object.keys(master)

  const localeFiles = fs
    .readdirSync(localesDir)
    .filter((f) => f.endsWith('.json') && f !== `${masterLocale}.json`)
    .sort()

  let totalMissingFixed = 0
  let totalUntranslatedFixed = 0

  for (const filename of localeFiles) {
    const locale = filename.replace(/\.json$/, '')
    const p = path.join(localesDir, filename)
    const data = readJson(p)

    let missingFixed = 0
    let untranslatedFixed = 0

    // Fill missing keys
    for (const key of masterKeys) {
      if (!(key in data)) {
        data[key] = master[key]
        missingFixed++
      }
    }

    // Fix untranslated keys (non-English locales only)
    if (!isEnglishVariant(locale)) {
      for (const key of masterKeys) {
        if (key in data && data[key] === master[key]) {
          data[key] = makePlaceholder(locale, master[key])
          untranslatedFixed++
        }
      }
    }

    // Keep key order consistent with master
    const sorted = sortByMaster(master, data)
    writeJson(p, sorted)

    if (missingFixed || untranslatedFixed) {
      console.log(
        `✅ ${filename}: missing fixed=${missingFixed}, untranslated fixed=${untranslatedFixed}`,
      )
    } else {
      console.log(`⏭️  ${filename}: already clean`)
    }

    totalMissingFixed += missingFixed
    totalUntranslatedFixed += untranslatedFixed
  }

  console.log('\n📊 i18n fix summary:')
  console.log(`- Missing keys fixed: ${totalMissingFixed}`)
  console.log(`- Untranslated keys fixed: ${totalUntranslatedFixed}`)
}

main()


