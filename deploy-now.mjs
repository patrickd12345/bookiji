#!/usr/bin/env node
/**
 * Deploy Now - Trigger Deployment via Multiple Methods
 * 
 * This script attempts to trigger a deployment using available methods:
 * 1. Vercel CLI (if authenticated)
 * 2. GitHub Actions trigger
 * 3. Manual instructions
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const projectPath = path.join(process.cwd(), '.vercel', 'project.json');

console.log('🚀 Deploy Now - Triggering Deployment\n');

// Get current commit
let currentCommit, currentBranch;
try {
  currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
  const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  
  console.log('📝 Current State:');
  console.log(`   Branch: ${currentBranch}`);
  console.log(`   Commit: ${currentCommit.substring(0, 7)}`);
  console.log(`   Message: ${commitMessage.split('\n')[0]}\n`);
} catch (e) {
  console.error('❌ Could not get git info');
  process.exit(1);
}

// Check if we're on the right branch
if (currentBranch !== 'bookiji') {
  console.log(`⚠️  Warning: Not on bookiji branch (currently on ${currentBranch})`);
  console.log('   Production deployments should be from bookiji branch\n');
}

// Method 1: Try Vercel CLI with token from env
console.log('🔧 Method 1: Vercel CLI Deployment\n');
if (process.env.VERCEL_TOKEN) {
  try {
    console.log('   Using VERCEL_TOKEN from environment...\n');
    execSync(`vercel deploy --prod --yes --token=${process.env.VERCEL_TOKEN}`, {
      stdio: 'inherit'
    });
    console.log('\n✅ Deployment triggered successfully via Vercel CLI!\n');
    process.exit(0);
  } catch (e) {
    console.log('⚠️  Vercel CLI deployment failed\n');
  }
} else {
  console.log('   ⚠️  VERCEL_TOKEN not found in environment');
  console.log('   To use this method: Set VERCEL_TOKEN environment variable\n');
}

// Method 2: Check if commit is pushed
console.log('🔧 Method 2: Verify Git Push Status\n');
try {
  const remoteCommit = execSync('git rev-parse origin/bookiji', { encoding: 'utf-8' }).trim();
  if (currentCommit === remoteCommit) {
    console.log('✅ Commit is pushed to remote\n');
    console.log('   GitHub integration should automatically trigger deployment');
    console.log('   Check: https://github.com/patrickd12345/bookiji/actions\n');
  } else {
    console.log('⚠️  Local commit not yet pushed to remote');
    console.log(`   Local:  ${currentCommit.substring(0, 7)}`);
    console.log(`   Remote: ${remoteCommit.substring(0, 7)}\n`);
    console.log('   Pushing to remote...\n');
    try {
      execSync('git push origin bookiji', { stdio: 'inherit' });
      console.log('\n✅ Pushed to remote - deployment should trigger automatically\n');
    } catch (e) {
      console.log('❌ Failed to push\n');
    }
  }
} catch (e) {
  console.log('⚠️  Could not check remote status\n');
}

// Method 3: Manual instructions
console.log('\n📋 Manual Deployment Options:\n');
console.log('Option A: Vercel CLI (requires login)');
console.log('   1. Run: vercel login');
console.log('   2. Run: vercel deploy --prod --yes\n');

console.log('Option B: Vercel Dashboard');
console.log('   1. Visit: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookijibck');
console.log('   2. Go to Deployments tab');
console.log('   3. Click "Redeploy" on latest deployment\n');

console.log('Option C: GitHub Actions');
console.log('   1. Visit: https://github.com/patrickd12345/bookiji/actions');
console.log('   2. Check if workflow is running for commit', currentCommit.substring(0, 7));
console.log('   3. If not, push a new commit to trigger\n');

// Check project config
if (fs.existsSync(projectPath)) {
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  console.log('\n📦 Project Info:');
  console.log(`   Project: ${project.projectName}`);
  console.log(`   Dashboard: https://vercel.com/${project.orgId}/${project.projectName}\n`);
}

console.log('✅ Deployment trigger script completed\n');
console.log('💡 The deployment should trigger automatically via GitHub integration');
console.log('   if the commit is pushed to the bookiji branch.\n');
