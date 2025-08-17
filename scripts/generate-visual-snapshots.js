#!/usr/bin/env node

/**
 * Generate initial visual regression snapshots
 * Run this script to create baseline screenshots for visual testing
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import path from 'path';

const SNAPSHOT_DIR = 'tests/visual/__snapshots__';
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 800 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'mobile', width: 375, height: 667 }
];

console.log('🎨 Generating initial visual regression snapshots...\n');

// Ensure snapshot directory exists
if (!existsSync(SNAPSHOT_DIR)) {
  mkdirSync(SNAPSHOT_DIR, { recursive: true });
  console.log('✅ Created snapshot directory');
}

// Generate snapshots for each viewport
for (const viewport of VIEWPORTS) {
  console.log(`📱 Generating snapshots for ${viewport.name} viewport (${viewport.width}x${viewport.height})...`);
  
  try {
    // Set viewport environment variable and run visual tests
    const env = {
      ...process.env,
      PLAYWRIGHT_VIEWPORT: `${viewport.width}x${viewport.height}`
    };
    
    execSync('npx playwright test tests/visual/home.spec.ts --update-snapshots', {
      env,
      stdio: 'inherit'
    });
    
    console.log(`✅ ${viewport.name} snapshots generated successfully`);
  } catch (error) {
    console.error(`❌ Failed to generate ${viewport.name} snapshots:`, error.message);
  }
}

console.log('\n🎯 Next steps:');
console.log('1. Review generated snapshots in tests/visual/__snapshots__/');
console.log('2. Commit snapshots to version control');
console.log('3. Run visual tests: npx playwright test tests/visual/');
console.log('4. Update snapshots when intentional changes are made: npx playwright test --update-snapshots');

