#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';

console.log('🚀 Triggering Vercel Production Deployment\n');

try {
  console.log('Step 1: Deploying to production...');
  const output = execSync('vercel deploy --prod --yes', { 
    encoding: 'utf8',
    stdio: 'pipe',
    shell: true
  });
  
  console.log('\n✅ Deployment Output:');
  console.log(output);
  
  // Try to extract URL from output
  const urlMatch = output.match(/https:\/\/[^\s]+/);
  if (urlMatch) {
    console.log(`\n🌍 Deployment URL: ${urlMatch[0]}`);
  }
  
} catch (error) {
  console.log('\n❌ Deployment Error:');
  if (error.stdout) console.log('STDOUT:', error.stdout);
  if (error.stderr) console.log('STDERR:', error.stderr);
  console.log('Exit code:', error.status);
}

console.log('\n📋 Project Configuration:');
try {
  const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
  console.log(`   Project: ${project.projectName}`);
  console.log(`   Project ID: ${project.projectId}`);
  console.log(`   Dashboard: https://vercel.com/${project.orgId}/${project.projectName}`);
} catch (e) {
  console.log('   Could not read project.json');
}


