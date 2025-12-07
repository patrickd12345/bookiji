#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

function runCommand(cmd, description) {
  console.log(`\n=== ${description} ===`);
  try {
    // Use spawn-like approach with explicit encoding
    const output = execSync(cmd, { 
      encoding: 'utf8', 
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: true
    });
    if (output && output.trim()) {
      console.log(output);
    } else {
      console.log('(No output)');
    }
  } catch (error) {
    if (error.stdout) console.log('STDOUT:', error.stdout);
    if (error.stderr) console.log('STDERR:', error.stderr);
    console.log('Exit code:', error.status);
  }
}

// Step 1: Verify project linkage
runCommand('vercel link --yes', 'Step 1: vercel link');

// Step 2: Pull environment configuration
runCommand('vercel pull --yes', 'Step 2: vercel pull');

// Step 3: Inspect project metadata
runCommand('vercel inspect', 'Step 3: vercel inspect');

// Step 4: List deployments
runCommand('vercel list', 'Step 4: vercel list');

// Step 5: Inspect production deployment
runCommand('vercel inspect --target production', 'Step 5: vercel inspect --target production');

// Step 6: Print project.json
console.log('\n=== Step 6: .vercel/project.json ===');
try {
  const content = fs.readFileSync('.vercel/project.json', 'utf8');
  console.log(content);
} catch (e) {
  console.log('.vercel/project.json does not exist');
}


