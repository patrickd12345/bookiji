#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';

const files = glob.sync(['src/**/*.ts', 'src/**/*.tsx'], { dot: false });

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let content = original;

  // Replace standalone 'any' type annotations with 'unknown'
  // - avoid words like 'any[]' by letting TS interpret 'unknown[]' (desired)
  // - avoid string literals by not touching inside quotes
  // Simple heuristic: only replace in contexts with ':' or '<' or ' as any'

  content = content.replace(/:\s*any\b/g, ': unknown');
  content = content.replace(/<\s*any\s*>/g, '<unknown>');
  content = content.replace(/\bas\s+any\b/g, 'as unknown');

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`updated: ${path.relative(process.cwd(), file)}`);
  }
}
