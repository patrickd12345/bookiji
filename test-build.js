#!/usr/bin/env node
import { execSync } from 'child_process';

console.log('=== Testing Project Build ===');
console.log('Current working directory:', process.cwd());

try {
  console.log('\n1. Checking Next.js version...');
  const nextVersion = execSync('npx next --version', { encoding: 'utf8', stdio: 'pipe' });
  console.log('Next.js version:', nextVersion.trim());
} catch (e) {
  console.error('Error getting Next.js version:', e.message);
}

try {
  console.log('\n2. Running TypeScript check...');
  const tsCheck = execSync('npx tsc --noEmit', { encoding: 'utf8', stdio: 'pipe' });
  console.log('TypeScript check passed');
} catch (e) {
  console.error('TypeScript errors found:');
  console.error(e.stdout || e.message);
}

try {
  console.log('\n3. Checking npm dependencies...');
  const npmLs = execSync('npm ls --depth=0', { encoding: 'utf8', stdio: 'pipe' });
  console.log(npmLs);
} catch (e) {
  console.log('npm ls output:', e.stdout || e.message);
}

console.log('\n=== Test Complete ===');

