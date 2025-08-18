#!/usr/bin/env node

import { execSync } from 'child_process';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

// 🛡️ Pre-commit Guard: Check for naked icon buttons
console.log('🔍 Scanning for icon buttons without aria-label...');

function findFiles(dir, extensions) {
  const files = [];
  
  function traverse(currentDir) {
    try {
      const items = readdirSync(currentDir);
      for (const item of items) {
        const fullPath = join(currentDir, item);
        const stat = statSync(fullPath);
        
        if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
          traverse(fullPath);
        } else if (stat.isFile() && extensions.some(ext => item.endsWith(ext))) {
          files.push(fullPath);
        }
      }
    } catch (err) {
      // Skip directories we can't read
    }
  }
  
  traverse(dir);
  return files;
}

const srcFiles = findFiles('src', ['.tsx', '.ts']);
let nakedButtons = [];

for (const file of srcFiles) {
  try {
    const content = readFileSync(file, 'utf8');
    
    // Look for icon button patterns (size="icon") and check surrounding context
    const iconButtonRegex = /size="icon"/g;
    let match;
    
    while ((match = iconButtonRegex.exec(content)) !== null) {
      const startPos = match.index;
      
      // Find the start and end of this JSX element
      let elementStart = content.lastIndexOf('<', startPos);
      let elementEnd = content.indexOf('>', startPos) + 1;
      
      // Extend to capture the full element (handle multi-line)
      let braceCount = 1;
      let pos = elementEnd;
      while (braceCount > 0 && pos < content.length) {
        if (content[pos] === '<') braceCount++;
        if (content[pos] === '>') braceCount--;
        pos++;
      }
      elementEnd = pos;
      
      const element = content.substring(elementStart, elementEnd);
      
      // Check if this element has accessible naming
      const hasAriaLabel = element.includes('aria-label') || element.includes('aria-labelledby');
      const hasSrOnly = element.includes('sr-only') || element.includes('screen-reader-only');
      
      if (!hasAriaLabel && !hasSrOnly) {
        const lineNumber = content.substring(0, startPos).split('\n').length;
        const elementPreview = element.replace(/\s+/g, ' ').trim().substring(0, 100) + '...';
        
        nakedButtons.push({
          file: file.replace(/\\/g, '/'),
          line: lineNumber,
          content: elementPreview
        });
      }
    }
  } catch (err) {
    // Skip files we can't read
  }
}

if (nakedButtons.length > 0) {
  console.log('❌ Found icon buttons without accessible names:');
  nakedButtons.forEach(button => {
    console.log(`  ${button.file}:${button.line} - ${button.content}`);
  });
  console.log('');
  console.log('🔧 Fix by adding aria-label:');
  console.log('   <Button size="icon" aria-label="Close dialog">');
  console.log('   OR add screen reader text:');
  console.log('   <Button size="icon"><span className="sr-only">Close</span>...</Button>');
  console.log('');
  process.exit(1);
} else {
  console.log('✅ All icon buttons have accessible names!');
  process.exit(0);
}
