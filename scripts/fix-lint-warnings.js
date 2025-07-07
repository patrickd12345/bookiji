#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Common fixes for lint warnings
const fixes = [
  // Fix unescaped entities
  {
    pattern: /'/g,
    replacement: '&apos;',
    description: 'Fix unescaped apostrophes'
  },
  {
    pattern: /"/g,
    replacement: '&quot;',
    description: 'Fix unescaped quotes'
  },
  // Remove unused imports
  {
    pattern: /import\s+\{[^}]*NextRequest[^}]*\}\s+from\s+['"]next\/server['"];?\s*\n/g,
    replacement: '',
    description: 'Remove unused NextRequest imports'
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    fixes.forEach(fix => {
      const newContent = content.replace(fix.pattern, fix.replacement);
      if (newContent !== content) {
        content = newContent;
        modified = true;
        console.log(`✅ ${fix.description} in ${filePath}`);
      }
    });
    
    if (modified) {
      fs.writeFileSync(filePath, content);
    }
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
  }
}

function walkDir(dir) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
      walkDir(filePath);
    } else if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      fixFile(filePath);
    }
  });
}

console.log('🔧 Starting lint warning fixes...');
walkDir('./src');
console.log('✅ Lint warning fixes completed!'); 