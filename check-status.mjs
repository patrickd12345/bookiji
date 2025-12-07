import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

const results = [];

try {
  // Check unstaged
  const unstaged = execSync('git diff --name-only', { encoding: 'utf8' });
  const unstagedFiles = unstaged.split('\n').filter(l => l.trim());
  results.push(`Unstaged files: ${unstagedFiles.length}`);
  if (unstagedFiles.length > 0) {
    results.push('First 20 unstaged:');
    unstagedFiles.slice(0, 20).forEach(f => results.push(`  ${f}`));
  }
  
  // Check staged
  const staged = execSync('git diff --cached --name-only', { encoding: 'utf8' });
  const stagedFiles = staged.split('\n').filter(l => l.trim());
  results.push(`\nStaged files: ${stagedFiles.length}`);
  if (stagedFiles.length > 0) {
    results.push('First 20 staged:');
    stagedFiles.slice(0, 20).forEach(f => results.push(`  ${f}`));
  }
  
  // Check status
  const status = execSync('git status --porcelain', { encoding: 'utf8' });
  const statusLines = status.split('\n').filter(l => l.trim());
  results.push(`\nTotal status lines: ${statusLines.length}`);
  if (statusLines.length > 0) {
    results.push('First 30 status lines:');
    statusLines.slice(0, 30).forEach(l => results.push(`  ${l}`));
  }
  
} catch (e) {
  results.push('Error: ' + e.message);
}

const output = results.join('\n');
writeFileSync('status-check.txt', output);
console.log(output);

