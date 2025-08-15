#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

// Function to read markdown files and extract key information
function extractContext() {
  const mdFiles = [
    'README.md',
    'PROJECT_TRACKING.md',
    'BETA_LAUNCH.md',
    'COMPETITIVE_ANALYSIS.md',
    'DATABASE_SETUP.md',
    'BRAND_GUIDELINES.md',
    'WIREFRAMES.md',
    'QUICK_SETUP.md'
  ];

  let context = '# Bookiji Context Summary\n\n';
  context += '**Last Updated:** ' + new Date().toISOString() + '\n\n';

  mdFiles.forEach(file => {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      
      // Extract key sections (first 200 chars + any important headers)
      const lines = content.split('\n');
      const summary = lines.slice(0, 10).join('\n'); // First 10 lines
      
      context += `## ${file.replace('.md', '')}\n`;
      context += summary + '\n\n';
    }
  });

  // Add current status
  context += '## Current Status\n';
  context += '- Global beta launched\n';
  context += '- Core features implemented\n';
  context += '- Database setup pending\n';
  context += '- AI integration in progress\n\n';

  return context;
}

// Generate and save context
const context = extractContext();
fs.writeFileSync('ai-context.md', context);
console.log('✅ Context summary saved to ai-context.md');
console.log('\n📋 Copy the contents of ai-context.md to quickly bring AI up to speed!'); 