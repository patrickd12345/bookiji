#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Master locale file (en-US)
const MASTER_LOCALE = path.join(__dirname, '..', 'src/locales/en-US.json');
const LOCALES_DIR = path.join(__dirname, '..', 'src/locales');

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadLocaleFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`Error loading ${filePath}: ${error.message}`, 'red');
    return null;
  }
}

function getMissingKeys(masterKeys, localeKeys) {
  return Object.keys(masterKeys).filter(key => !(key in localeKeys));
}

function getUntranslatedKeys(masterKeys, localeKeys, filename) {
  // For English variants, consider them as translated since they're in English
  const isEnglishVariant = filename.startsWith('en-');
  
  return Object.keys(masterKeys).filter(key => {
    if (!(key in localeKeys)) return false;
    const masterValue = masterKeys[key];
    const localeValue = localeKeys[key];
    
    // Check if the value is the same as master (untranslated)
    // But for English variants, this is acceptable
    return !isEnglishVariant && masterValue === localeValue;
  });
}

function analyzeLocaleFile(masterKeys, localePath, localeKeys, filename) {
  const missingKeys = getMissingKeys(masterKeys, localeKeys);
  const untranslatedKeys = getUntranslatedKeys(masterKeys, localeKeys, filename);
  const totalKeys = Object.keys(masterKeys).length;
  const translatedKeys = totalKeys - missingKeys.length - untranslatedKeys.length;
  const completeness = ((translatedKeys / totalKeys) * 100).toFixed(1);

  return {
    filename,
    totalKeys,
    missingKeys,
    untranslatedKeys,
    translatedKeys,
    completeness
  };
}

function main() {
  log('🌍 Bookiji i18n Completeness Check', 'bold');
  log('=====================================\n', 'blue');

  // Load master locale
  const masterLocale = loadLocaleFile(MASTER_LOCALE);
  if (!masterLocale) {
    log('❌ Failed to load master locale file', 'red');
    process.exit(1);
  }

  const masterKeys = masterLocale;
  const totalMasterKeys = Object.keys(masterKeys).length;
  
  log(`📋 Master locale (en-US): ${totalMasterKeys} keys\n`, 'green');

  // Get all locale files
  const localeFiles = fs.readdirSync(LOCALES_DIR)
    .filter(file => file.endsWith('.json') && file !== 'en-US.json')
    .sort();

  if (localeFiles.length === 0) {
    log('❌ No locale files found', 'red');
    process.exit(1);
  }

  const results = [];
  let totalIssues = 0;

  // Analyze each locale file
  for (const localeFile of localeFiles) {
    const localePath = path.join(LOCALES_DIR, localeFile);
    const localeKeys = loadLocaleFile(localePath);
    
    if (localeKeys) {
      const analysis = analyzeLocaleFile(masterKeys, localePath, localeKeys, path.basename(localePath));
      results.push(analysis);
      
      if (analysis.missingKeys.length > 0 || analysis.untranslatedKeys.length > 0) {
        totalIssues += analysis.missingKeys.length + analysis.untranslatedKeys.length;
      }
    }
  }

  // Sort results by completeness (ascending)
  results.sort((a, b) => parseFloat(a.completeness) - parseFloat(b.completeness));

  // Display results
  log('📊 Locale Completeness Report:', 'bold');
  log('===============================\n', 'blue');

  for (const result of results) {
    const status = result.completeness >= 90 ? '🟢' : 
                   result.completeness >= 70 ? '🟡' : 
                   result.completeness >= 50 ? '🟠' : '🔴';
    
    log(`${status} ${result.filename}: ${result.completeness}% complete`, 
        result.completeness >= 90 ? 'green' : 
        result.completeness >= 70 ? 'yellow' : 
        result.completeness >= 50 ? 'magenta' : 'red');
    
    log(`   📈 ${result.translatedKeys}/${result.totalKeys} keys translated`);
    
    if (result.missingKeys.length > 0) {
      log(`   ❌ ${result.missingKeys.length} missing keys`, 'red');
    }
    
    if (result.untranslatedKeys.length > 0) {
      log(`   ⚠️  ${result.untranslatedKeys.length} untranslated keys`, 'yellow');
    }
    
    log('');
  }

  // Summary
  log('📋 Summary:', 'bold');
  log('===========\n', 'blue');
  
  const avgCompleteness = (results.reduce((sum, r) => sum + parseFloat(r.completeness), 0) / results.length).toFixed(1);
  log(`Average completeness: ${avgCompleteness}%`, 'cyan');
  log(`Total issues found: ${totalIssues}`, totalIssues > 0 ? 'red' : 'green');
  
  if (totalIssues > 0) {
    log('\n🚨 Action Required:', 'red');
    log('==================', 'red');
    log('Some locale files need attention. Consider:', 'yellow');
    log('1. Adding missing translation keys', 'yellow');
    log('2. Translating untranslated keys', 'yellow');
    log('3. Using professional translation services for better quality', 'yellow');
  } else {
    log('\n✅ All locale files are complete!', 'green');
  }

  // Generate detailed report file
  const reportPath = 'i18n-completeness-report.json';
  const report = {
    generated: new Date().toISOString(),
    masterLocale: 'en-US',
    totalMasterKeys,
    results,
    summary: {
      averageCompleteness: avgCompleteness,
      totalIssues
    }
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  log(`\n📄 Detailed report saved to: ${reportPath}`, 'cyan');
}

// Run main function
main();
