#!/usr/bin/env node
/**
 * Free Translation Script using LibreTranslate Public Instance
 * No API key required - uses public LibreTranslate service
 */

import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')
const baseLocale = 'en-US'
const basePath = path.join(localesDir, `${baseLocale}.json`)
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))

// LibreTranslate language codes
const LIBRE_LANG_CODES = {
  'ar-SA': 'ar',
  'cs-CZ': 'cs',
  'da-DK': 'da',
  'de-CH': 'de',
  'de-DE': 'de',
  'en-IN': 'en',
  'es-ES': 'es',
  'es-MX': 'es',
  'fi-FI': 'fi',
  'fr-CA': 'fr',
  'fr-FR': 'fr',
  'hu-HU': 'hu',
  'id-ID': 'id',
  'ja-JP': 'ja',
  'ko-KR': 'ko',
  'ms-MY': 'ms',
  'nl-NL': 'nl',
  'no-NO': 'no',
  'pl-PL': 'pl',
  'pt-BR': 'pt',
  'ru-RU': 'ru',
  'sv-SE': 'sv',
  'th-TH': 'th',
  'tr-TR': 'tr',
  'uk-UA': 'uk',
  'vi-VN': 'vi',
  'zh-CN': 'zh',
  'hi-IN': 'hi'
}

const incompleteLocales = Object.keys(LIBRE_LANG_CODES)
const LIBRETRANSLATE_URL = 'https://libretranslate.com/translate'
const BATCH_SIZE = 5
const MAX_RETRIES = 3

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Translate text using LibreTranslate public API
 */
async function translateLibre(text, targetLang, retries = 0) {
  try {
    const response = await fetch(LIBRETRANSLATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        q: text,
        source: 'en',
        target: targetLang,
        format: 'text'
      })
    })

    if (!response.ok) {
      if (response.status === 429 && retries < MAX_RETRIES) {
        const waitMs = 1000 * (retries + 1)
        console.warn(`LibreTranslate 429 – backing off ${waitMs}ms (retry ${retries + 1}/${MAX_RETRIES})`)
        await sleep(waitMs)
        return translateLibre(text, targetLang, retries + 1)
      }
      throw new Error(`LibreTranslate error: ${response.statusText}`)
    }

    const data = await response.json()
    return data.translatedText
  } catch (error) {
    console.error(`Translation error: ${error.message}`)
    throw error
  }
}

/**
 * Get missing keys for a locale
 */
function getMissingKeys(locale) {
  const localePath = path.join(localesDir, `${locale}.json`)
  if (!fs.existsSync(localePath)) return []

  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  const baseKeys = Object.keys(base)
  
  // Only return keys that are currently English (fallback)
  return baseKeys.filter(k => {
    if (!(k in data)) return true
    // If the value matches English, it's likely a fallback
    return data[k] === base[k]
  })
}

/**
 * Translate missing keys for a locale
 */
async function translateLocale(locale, keys, dryRun = false) {
  console.log(`\n🌍 Translating ${locale}...`)
  const localePath = path.join(localesDir, `${locale}.json`)
  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  const langCode = LIBRE_LANG_CODES[locale]

  let translated = 0
  let errors = 0
  const errorsList = []

  const batches = []
  for (let i = 0; i < keys.length; i += BATCH_SIZE) {
    batches.push(keys.slice(i, i + BATCH_SIZE))
  }

  for (const batch of batches) {
    const englishTexts = batch.map(key => base[key])

    try {
      if (dryRun) {
        batch.forEach(key => {
          console.log(`  [DRY RUN] Would translate: ${key}`)
          translated++
        })
        continue
      }

      const result = await translateLibre(englishTexts, langCode)
      const translations = Array.isArray(result) ? result : [result]

      batch.forEach((key, idx) => {
        data[key] = translations[idx] ?? base[key]
        translated++
        console.log(`  ? ${key}`)
      })
    } catch (error) {
      errors += batch.length
      batch.forEach(key => {
        console.error(`  ? ${key}: ${error.message}`)
        errorsList.push({ key, error: error.message })
        data[key] = base[key]
      })
    }

    if (!dryRun) {
      await sleep(200)
    }
  }
  if (!dryRun && translated > 0) {
    // Sort keys to match base locale
    const sorted = {}
    Object.keys(base).forEach(k => {
      if (k in data) {
        sorted[k] = data[k]
      }
    })

    fs.writeFileSync(localePath, JSON.stringify(sorted, null, 2) + '\n')
  }

  return { translated, errors, errorsList }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const localeFilter = args.find(arg => arg.startsWith('--locale='))?.split('=')[1]
  const limit = args.find(arg => arg.startsWith('--limit='))?.split('=')[1] ? parseInt(args.find(arg => arg.startsWith('--limit='))?.split('=')[1]) : undefined

  console.log(`\n🚀 LibreTranslate Public API (Free)`)
  console.log(`📝 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (localeFilter) {
    console.log(`🎯 Filter: ${localeFilter}`)
  }
  if (limit) {
    console.log(`⏸️  Limit: ${limit} keys per locale`)
  }

  const localesToProcess = localeFilter 
    ? [localeFilter] 
    : incompleteLocales.filter(locale => {
        const missing = getMissingKeys(locale)
        return missing.length > 0
      })

  if (localesToProcess.length === 0) {
    console.log('\n✅ All locales are complete!')
    return
  }

  console.log(`\n📊 Processing ${localesToProcess.length} locale(s)...`)

  let totalTranslated = 0
  let totalErrors = 0
  const allErrors = []

  for (const locale of localesToProcess) {
    let missing = getMissingKeys(locale)
    if (missing.length === 0) {
      console.log(`\n⏭️  ${locale}: Already translated`)
      continue
    }

    if (limit) {
      missing = missing.slice(0, limit)
      console.log(`\n⚠️  Limiting to first ${limit} keys for ${locale}`)
    }

    const result = await translateLocale(locale, missing, dryRun)
    totalTranslated += result.translated
    totalErrors += result.errors
    allErrors.push(...result.errorsList.map(e => ({ locale, ...e })))

    // Longer delay between locales to respect rate limits
    if (!dryRun && localesToProcess.length > 1) {
      await new Promise(resolve => setTimeout(resolve, 1000))
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`  ✅ Translated: ${totalTranslated}`)
  console.log(`  ❌ Errors: ${totalErrors}`)
  
  if (allErrors.length > 0) {
    console.log(`\n❌ Errors by locale:`)
    allErrors.forEach(({ locale, key, error }) => {
      console.log(`  ${locale}.${key}: ${error}`)
    })
  }
  
  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply translations`)
  } else if (totalTranslated > 0) {
    console.log(`\n✅ Translations saved!`)
    console.log(`💡 Review translations and adjust as needed`)
  }
}

main().catch(console.error)

