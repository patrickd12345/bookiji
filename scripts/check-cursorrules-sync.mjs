#!/usr/bin/env node
/**
 * Check if .cursorrules references all important documentation files
 * This helps ensure .cursorrules stays in sync with the codebase
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const REPO_ROOT = process.cwd();

// Important files that should be referenced in .cursorrules
const IMPORTANT_FILES = [
  'README.md',
  'docs/BOOKIJI_CONTINUITY_KERNEL.md',
  'docs/development/DATABASE_MANAGEMENT_POLICY.md',
  'genome/master-genome.yaml',
  'genome/linter-rules.md',
  'docs/BOOKIJI_CONTINUITY_INDEX.json',
];

// Important directories that should be mentioned
const IMPORTANT_DIRS = [
  'docs/support-module/',
  'docs/bookiji-kb/',
  'docs/development/',
];

function checkCursorRules() {
  const cursorRulesPath = join(REPO_ROOT, '.cursorrules');
  
  if (!existsSync(cursorRulesPath)) {
    console.error('❌ .cursorrules file not found!');
    process.exit(1);
  }

  const cursorRulesContent = readFileSync(cursorRulesPath, 'utf-8');
  const missing = [];
  const found = [];

  // Check files
  for (const file of IMPORTANT_FILES) {
    const filePath = join(REPO_ROOT, file);
    if (existsSync(filePath)) {
      // Check if referenced in .cursorrules
      const fileName = file.split('/').pop();
      const dirName = file.split('/').slice(0, -1).join('/');
      
      if (cursorRulesContent.includes(file) || 
          cursorRulesContent.includes(fileName) ||
          cursorRulesContent.includes(dirName)) {
        found.push(file);
      } else {
        missing.push(file);
      }
    }
  }

  // Check directories
  for (const dir of IMPORTANT_DIRS) {
    if (cursorRulesContent.includes(dir)) {
      found.push(dir);
    } else {
      missing.push(dir);
    }
  }

  // Report results
  console.log('📋 .cursorrules Sync Check\n');
  console.log(`✅ Found references: ${found.length}`);
  found.forEach(f => console.log(`   - ${f}`));
  
  if (missing.length > 0) {
    console.log(`\n⚠️  Missing references: ${missing.length}`);
    missing.forEach(f => console.log(`   - ${f}`));
    console.log('\n💡 Consider updating .cursorrules to include these files/directories');
    process.exit(1);
  } else {
    console.log('\n✅ All important files are referenced in .cursorrules');
    process.exit(0);
  }
}

checkCursorRules();









