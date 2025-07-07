#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Critical fixes for SEO and user experience
const criticalFixes = [
  // Fix unescaped entities (critical for SEO and accessibility)
  {
    pattern: /([^&])'([^;])/g,
    replacement: '$1&apos;$2',
    description: 'Fix unescaped apostrophes',
    test: (content) => content.includes("'") && !content.includes("&apos;")
  },
  {
    pattern: /([^&])"([^;])/g,
    replacement: '$1&quot;$2',
    description: 'Fix unescaped quotes',
    test: (content) => content.includes('"') && !content.includes('&quot;')
  },
  // Remove unused imports (reduces bundle size)
  {
    pattern: /import\s+\{[^}]*NextRequest[^}]*\}\s+from\s+['"]next\/server['"];?\s*\n/g,
    replacement: '',
    description: 'Remove unused NextRequest imports',
    test: (content) => content.includes('NextRequest') && content.includes('next/server')
  },
  // Remove unused variables (improves code quality)
  {
    pattern: /const\s+(\w+)\s*=\s*[^;]+;\s*\/\/\s*unused/g,
    replacement: '',
    description: 'Remove commented unused variables',
    test: (content) => content.includes('// unused')
  }
];

function fixFile(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    criticalFixes.forEach(fix => {
      if (fix.test && fix.test(content)) {
        const newContent = content.replace(fix.pattern, fix.replacement);
        if (newContent !== content) {
          content = newContent;
          modified = true;
          console.log(`✅ ${fix.description} in ${filePath}`);
        }
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

console.log('🔧 Starting critical lint fixes...');
walkDir('./src');
console.log('✅ Critical lint fixes completed!'); 