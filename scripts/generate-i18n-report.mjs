#!/usr/bin/env node
import fs from 'node:fs'
import path from 'node:path'

const localesDir = path.resolve('src/locales')
const baseLocale = 'en-US'
const basePath = path.join(localesDir, `${baseLocale}.json`)
const base = JSON.parse(fs.readFileSync(basePath, 'utf8'))
const baseKeys = Object.keys(base).sort()

const localeFiles = fs.readdirSync(localesDir).filter(f => f.endsWith('.json'))
const report = {
  baseLocale,
  totalKeys: baseKeys.length,
  locales: []
}

for (const file of localeFiles) {
  const locale = path.basename(file, '.json')
  const data = JSON.parse(fs.readFileSync(path.join(localesDir, file), 'utf8'))
  const keys = Object.keys(data)
  
  const missing = baseKeys.filter(k => !keys.includes(k))
  const extra = keys.filter(k => !baseKeys.includes(k))
  const coverage = ((baseKeys.length - missing.length) / baseKeys.length) * 100
  
  report.locales.push({
    locale,
    coverage: coverage.toFixed(1),
    totalKeys: keys.length,
    missing: missing.length,
    missingKeys: missing,
    extra: extra.length,
    extraKeys: extra,
    status: coverage >= 95 ? 'complete' : coverage >= 80 ? 'partial' : 'incomplete'
  })
}

// Sort by coverage
report.locales.sort((a, b) => parseFloat(b.coverage) - parseFloat(a.coverage))

// Generate report
console.log('\n📊 i18n Completeness Report\n')
console.log(`Base Locale: ${baseLocale} (${baseKeys.length} keys)\n`)

console.log('Coverage Summary:')
const complete = report.locales.filter(l => l.status === 'complete').length
const partial = report.locales.filter(l => l.status === 'partial').length
const incomplete = report.locales.filter(l => l.status === 'incomplete').length

console.log(`✅ Complete (≥95%): ${complete}`)
console.log(`⚠️  Partial (80-94%): ${partial}`)
console.log(`❌ Incomplete (<80%): ${incomplete}\n`)

console.log('Locale Details:')
for (const locale of report.locales) {
  const icon = locale.status === 'complete' ? '✅' : locale.status === 'partial' ? '⚠️' : '❌'
  console.log(`${icon} ${locale.locale.padEnd(10)} ${locale.coverage.padStart(6)}% (${locale.totalKeys}/${baseKeys.length} keys, ${locale.missing} missing)`)
}

// Save detailed report
const reportPath = path.resolve('i18n-completeness-report.json')
fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
console.log(`\n📄 Detailed report saved to: ${reportPath}`)

// Exit with error if any incomplete
if (incomplete > 0) {
  console.log('\n⚠️  Some locales are incomplete. Consider running translation updates.')
  process.exit(1)
}

