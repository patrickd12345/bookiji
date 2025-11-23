#!/usr/bin/env node
/**
 * Translation API Integration Script
 * Supports multiple translation services: Google Translate, DeepL, LibreTranslate
 */

import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')
const baseLocale = 'en-US'
const basePath = path.join(localesDir, `${baseLocale}.json`)
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))

// Translation service configuration
const TRANSLATION_SERVICE = process.env.TRANSLATION_SERVICE || 'google' // 'google', 'deepl', 'libre'
const API_KEY = process.env.TRANSLATION_API_KEY || ''

// Language code mapping for translation APIs
const LANGUAGE_CODES = {
  'ar-SA': 'ar',
  'cs-CZ': 'cs',
  'da-DK': 'da',
  'en-IN': 'en',
  'fi-FI': 'fi',
  'hu-HU': 'hu',
  'id-ID': 'id',
  'ms-MY': 'ms',
  'nl-NL': 'nl',
  'no-NO': 'no',
  'pl-PL': 'pl',
  'ru-RU': 'ru',
  'sv-SE': 'sv',
  'tr-TR': 'tr',
  'uk-UA': 'uk'
}

// Incomplete locales
const incompleteLocales = Object.keys(LANGUAGE_CODES)

/**
 * Translate text using Google Translate API
 */
async function translateGoogle(text, targetLang) {
  if (!API_KEY) {
    throw new Error('GOOGLE_TRANSLATE_API_KEY not set')
  }

  const url = `https://translation.googleapis.com/language/translate/v2?key=${API_KEY}`
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      target: targetLang,
      source: 'en'
    })
  })

  if (!response.ok) {
    throw new Error(`Google Translate API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.data.translations[0].translatedText
}

/**
 * Translate text using DeepL API
 */
async function translateDeepL(text, targetLang) {
  if (!API_KEY) {
    throw new Error('DEEPL_API_KEY not set')
  }

  const url = 'https://api-free.deepl.com/v2/translate'
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `DeepL-Auth-Key ${API_KEY}`
    },
    body: new URLSearchParams({
      text: text,
      target_lang: targetLang.toUpperCase(),
      source_lang: 'EN'
    })
  })

  if (!response.ok) {
    throw new Error(`DeepL API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.translations[0].text
}

/**
 * Translate text using LibreTranslate (self-hosted or public instance)
 */
async function translateLibre(text, targetLang) {
  const apiUrl = process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com/translate'
  
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      q: text,
      source: 'en',
      target: targetLang,
      format: 'text',
      api_key: API_KEY || undefined
    })
  })

  if (!response.ok) {
    throw new Error(`LibreTranslate API error: ${response.statusText}`)
  }

  const data = await response.json()
  return data.translatedText
}

/**
 * Translate using selected service
 */
async function translate(text, targetLang, service = TRANSLATION_SERVICE) {
  const langCode = LANGUAGE_CODES[targetLang] || targetLang.split('-')[0]

  switch (service) {
    case 'google':
      return await translateGoogle(text, langCode)
    case 'deepl':
      return await translateDeepL(text, langCode)
    case 'libre':
      return await translateLibre(text, langCode)
    default:
      throw new Error(`Unknown translation service: ${service}`)
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
  return baseKeys.filter(k => !(k in data))
}

/**
 * Translate missing keys for a locale
 */
async function translateLocale(locale, keys, dryRun = false) {
  console.log(`\n🌍 Translating ${locale}...`)
  const localePath = path.join(localesDir, `${locale}.json`)
  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))

  let translated = 0
  let errors = 0

  for (const key of keys) {
    const englishText = base[key]
    
    // Skip if already exists
    if (key in data && data[key] !== englishText) {
      continue
    }

    try {
      if (dryRun) {
        console.log(`  [DRY RUN] Would translate: ${key}`)
        translated++
      } else {
        const translatedText = await translate(englishText, locale)
        data[key] = translatedText
        translated++
        console.log(`  ✅ ${key}`)
        
        // Rate limiting - wait 100ms between requests
        await new Promise(resolve => setTimeout(resolve, 100))
      }
    } catch (error) {
      console.error(`  ❌ ${key}: ${error.message}`)
      errors++
      // Keep English fallback on error
      data[key] = englishText
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

  return { translated, errors }
}

/**
 * Main function
 */
async function main() {
  const args = process.argv.slice(2)
  const dryRun = args.includes('--dry-run')
  const localeFilter = args.find(arg => arg.startsWith('--locale='))?.split('=')[1]

  if (!API_KEY && !dryRun) {
    console.error('❌ Error: Translation API key not set')
    console.error('Set TRANSLATION_API_KEY environment variable')
    console.error('Or use --dry-run to see what would be translated')
    process.exit(1)
  }

  console.log(`\n🚀 Translation Service: ${TRANSLATION_SERVICE}`)
  console.log(`📝 Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  if (localeFilter) {
    console.log(`🎯 Filter: ${localeFilter}`)
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

  for (const locale of localesToProcess) {
    const missing = getMissingKeys(locale)
    if (missing.length === 0) {
      console.log(`\n⏭️  ${locale}: Already complete`)
      continue
    }

    const result = await translateLocale(locale, missing, dryRun)
    totalTranslated += result.translated
    totalErrors += result.errors
  }

  console.log(`\n📊 Summary:`)
  console.log(`  ✅ Translated: ${totalTranslated}`)
  console.log(`  ❌ Errors: ${totalErrors}`)
  
  if (dryRun) {
    console.log(`\n💡 Run without --dry-run to apply translations`)
  }
}

main().catch(console.error)

