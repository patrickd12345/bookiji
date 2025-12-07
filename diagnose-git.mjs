#!/usr/bin/env node
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const results = [];

try {
  results.push('=== GIT DIAGNOSTIC ===\n');
  
  // Check staged
  const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  const stagedCount = staged.split('\n').filter(l => l.trim()).length;
  results.push(`Staged files: ${stagedCount}`);
  
  // Check unstaged
  const unstaged = execSync('git diff --name-only', { encoding: 'utf8' });
  const unstagedCount = unstaged.split('\n').filter(l => l.trim()).length;
  results.push(`Unstaged files: ${unstagedCount}`);
  
  // Check status
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  const lines = status.split('\n').filter(l => l.trim());
  results.push(`\nStatus output (${lines.length} lines):`);
  lines.slice(0, 20).forEach(line => results.push(line));
  
  if (lines.length > 20) {
    results.push(`... and ${lines.length - 20} more`);
  }
  
} catch (e) {
  results.push('Error: ' + e.message);
}

const output = results.join('\n');
writeFileSync('git-diagnostic.txt', output);
console.log('Diagnostic written to git-diagnostic.txt');
console.log(output);
