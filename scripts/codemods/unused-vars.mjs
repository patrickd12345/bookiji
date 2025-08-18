#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import glob from 'fast-glob';

const patterns = ['src/**/*.ts', 'src/**/*.tsx'];
const files = glob.sync(patterns, { dot: false });

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  let content = original;

  // Prefix parameters with underscore to quiet unused warnings
  content = content.replace(/function\s+(\w+)\s*\(([^)]*)\)/g, (match, name, params) => {
    const fixed = params
      .split(',')
      .map((p) => p.trim())
      .map((p) => {
        if (!p) return p;
        if (p.startsWith('_')) return p;
        // Keep rest params and defaults intact
        if (p.startsWith('...')) return '...' + (p.slice(3).startsWith('_') ? p.slice(3) : '_' + p.slice(3));
        const [id, ...rest] = p.split('=');
        const idTrim = id.trim();
        const suffix = rest.length ? '=' + rest.join('=') : '';
        // handle typing like param: Type
        const parts = idTrim.split(':');
        const namePart = parts[0].trim();
        const typePart = parts.slice(1).join(':');
        const newName = namePart.startsWith('_') ? namePart : '_' + namePart;
        return typePart ? `${newName}: ${typePart}${suffix}` : `${newName}${suffix}`;
      })
      .join(', ');
    return `function ${name}(${fixed})`;
  });

  if (content !== original) {
    fs.writeFileSync(file, content);
    console.log(`updated: ${path.relative(process.cwd(), file)}`);
  }
}
