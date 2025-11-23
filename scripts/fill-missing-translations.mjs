#!/usr/bin/env node
/**
 * Script to help fill missing translation keys
 * Shows what's missing and can optionally fill with English fallback
 */

import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')
const baseLocale = 'en-US'
const basePath = path.join(localesDir, `${baseLocale}.json`)
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))
const baseKeys = Object.keys(base).sort()

// Incomplete locales (69.5% coverage)
const incompleteLocales = [
  'ar-SA', 'cs-CZ', 'da-DK', 'en-IN', 'fi-FI', 'hu-HU', 
  'id-ID', 'ms-MY', 'nl-NL', 'no-NO', 'pl-PL', 'ru-RU', 
  'sv-SE', 'tr-TR', 'uk-UA'
]

console.log('\n📋 Missing Translation Keys Analysis\n')
console.log(`Base Locale: ${baseLocale} (${baseKeys.length} keys)\n`)

// Find missing keys for each incomplete locale
const missingKeysMap = new Map()

for (const locale of incompleteLocales) {
  const localePath = path.join(localesDir, `${locale}.json`)
  if (!fs.existsSync(localePath)) {
    console.error(`❌ Locale file not found: ${localePath}`)
    continue
  }

  const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
  const keys = Object.keys(data)
  const missing = baseKeys.filter(k => !keys.includes(k))
  
  missingKeysMap.set(locale, missing)
  
  console.log(`${locale}: Missing ${missing.length} keys`)
}

// Find common missing keys
const allMissing = Array.from(missingKeysMap.values()).flat()
const missingCounts = {}
allMissing.forEach(key => {
  missingCounts[key] = (missingCounts[key] || 0) + 1
})

const commonMissing = Object.entries(missingCounts)
  .filter(([_, count]) => count === incompleteLocales.length)
  .map(([key, _]) => key)
  .sort()

console.log(`\n🔑 Common Missing Keys (all ${incompleteLocales.length} locales):`)
console.log(`Total: ${commonMissing.length} keys\n`)

// Group by category
const categories = {
  'demo.*': commonMissing.filter(k => k.startsWith('demo.')),
  'chat.*': commonMissing.filter(k => k.startsWith('chat.')),
  'home.*': commonMissing.filter(k => k.startsWith('home.')),
  'feature.*': commonMissing.filter(k => k.startsWith('feature.')),
  'radius.*': commonMissing.filter(k => k.startsWith('radius.')),
  'privacy.*': commonMissing.filter(k => k.startsWith('privacy.')),
  'theme.*': commonMissing.filter(k => k.startsWith('theme.')),
  'buttons.*': commonMissing.filter(k => k.startsWith('buttons.')),
  'cta.*': commonMissing.filter(k => k.startsWith('cta.')),
  'other': commonMissing.filter(k => 
    !k.startsWith('demo.') && !k.startsWith('chat.') && 
    !k.startsWith('home.') && !k.startsWith('feature.') &&
    !k.startsWith('radius.') && !k.startsWith('privacy.') &&
    !k.startsWith('theme.') && !k.startsWith('buttons.') &&
    !k.startsWith('cta.')
  )
}

console.log('📊 Missing Keys by Category:')
for (const [category, keys] of Object.entries(categories)) {
  if (keys.length > 0) {
    console.log(`  ${category}: ${keys.length} keys`)
    if (keys.length <= 5) {
      keys.forEach(k => console.log(`    - ${k}`))
    }
  }
}

console.log(`\n📝 Full List of ${commonMissing.length} Missing Keys:`)
commonMissing.forEach((key, idx) => {
  console.log(`${(idx + 1).toString().padStart(3)}. ${key}`)
})

// Save to file for reference
const outputPath = path.resolve('missing-translation-keys.json')
fs.writeFileSync(outputPath, JSON.stringify({
  totalMissing: commonMissing.length,
  missingKeys: commonMissing,
  incompleteLocales,
  categories
}, null, 2))

console.log(`\n💾 Full analysis saved to: ${outputPath}`)
console.log(`\n💡 To fill with English fallback (temporary):`)
console.log(`   node scripts/fill-missing-translations.mjs --fill`)

// If --fill flag, fill missing keys with English values
if (process.argv.includes('--fill')) {
  console.log('\n🔄 Filling missing keys with English fallback...\n')
  
  for (const locale of incompleteLocales) {
    const localePath = path.join(localesDir, `${locale}.json`)
    const data = JSON.parse(fs.readFileSync(localePath, 'utf8'))
    const missing = missingKeysMap.get(locale) || []
    
    let added = 0
    for (const key of missing) {
      if (!(key in data)) {
        data[key] = base[key]
        added++
      }
    }
    
    // Sort keys
    const sorted = {}
    baseKeys.forEach(key => {
      if (key in data) {
        sorted[key] = data[key]
      }
    })
    
    fs.writeFileSync(localePath, JSON.stringify(sorted, null, 2) + '\n')
    console.log(`✅ ${locale}: Added ${added} keys (now ${Object.keys(sorted).length}/${baseKeys.length})`)
  }
  
  console.log('\n✅ All missing keys filled with English fallback')
  console.log('⚠️  Remember to replace with proper translations!')
}

