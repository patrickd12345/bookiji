#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

console.log('=== Step 1: vercel link ===');
try {
  const output = execSync('vercel link --yes', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}

console.log('\n=== Step 2: vercel pull ===');
try {
  const output = execSync('vercel pull --yes', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}

console.log('\n=== Step 3: vercel inspect ===');
try {
  const output = execSync('vercel inspect', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}

console.log('\n=== Step 4: vercel list ===');
try {
  const output = execSync('vercel list', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}

console.log('\n=== Step 5: vercel inspect --target production ===');
try {
  const output = execSync('vercel inspect --target production', { encoding: 'utf8', stdio: 'pipe' });
  console.log(output);
} catch (e) {
  console.log('STDOUT:', e.stdout);
  console.log('STDERR:', e.stderr);
}

console.log('\n=== Step 6: .vercel/project.json ===');
try {
  const content = fs.readFileSync('.vercel/project.json', 'utf8');
  console.log(content);
} catch (e) {
  console.log('.vercel/project.json does not exist');
}


