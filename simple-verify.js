#!/usr/bin/env node
import fs from 'fs';
import { execSync } from 'node:child_process';

console.log('=== QA Setup Verification ===\n');

// Check QA branch
console.log('1. QA Branch:');
try {
  execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
  console.log('   ✅ QA branch exists');
} catch (e) {
  console.log('   ❌ QA branch does not exist');
}

// Check project
console.log('\n2. Vercel Project:');
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
console.log(`   Project: ${project.projectName}`);
console.log(`   Project ID: ${project.projectId}`);
console.log(`   Org ID: ${project.orgId}`);

console.log('\n3. Next Steps:');
console.log('   To verify production branch, check Vercel Dashboard:');
console.log(`   https://vercel.com/${project.orgId}/${project.projectName}/settings/git`);
console.log('\n   Or run: node execute-qa-setup.js');
