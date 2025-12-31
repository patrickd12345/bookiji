#!/usr/bin/env node
/**
 * Fix Deployment Issue - Comprehensive Vercel CLI Diagnostic and Fix Tool
 * 
 * This script:
 * 1. Checks Vercel project configuration
 * 2. Verifies Git integration
 * 3. Checks recent deployments
 * 4. Triggers a new deployment if needed
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import os from 'os';
import https from 'https';

const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
let projectId, orgId, projectName;

// Read project config
try {
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  projectId = project.projectId;
  orgId = project.orgId;
  projectName = project.projectName;
  console.log('📋 Project Configuration:');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Org ID: ${orgId}`);
  console.log(`   Project Name: ${projectName}\n`);
} catch (e) {
  console.error('❌ Could not read .vercel/project.json');
  console.log('   Running: vercel link...\n');
  try {
    execSync('vercel link --yes', { stdio: 'inherit' });
    const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
    projectId = project.projectId;
    orgId = project.orgId;
    projectName = project.projectName;
  } catch (e2) {
    console.error('❌ Failed to link project. Please run: vercel login');
    process.exit(1);
  }
}

// Get current git commit
let currentCommit;
try {
  currentCommit = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
  const commitMessage = execSync('git log -1 --pretty=%B', { encoding: 'utf-8' }).trim();
  console.log('📝 Current Git State:');
  console.log(`   Commit: ${currentCommit.substring(0, 7)}`);
  console.log(`   Message: ${commitMessage}\n`);
} catch (e) {
  console.log('⚠️  Could not get git commit info\n');
}

// Step 1: Try to use Vercel CLI directly
console.log('🔧 Step 1: Attempting Direct Deployment...\n');
try {
  console.log('   Running: vercel deploy --prod --yes\n');
  execSync('vercel deploy --prod --yes', { 
    stdio: 'inherit',
    env: { ...process.env }
  });
  console.log('\n✅ Deployment triggered successfully!\n');
  process.exit(0);
} catch (e) {
  console.log('⚠️  Direct deployment failed (may need authentication)\n');
  console.log('   Error:', e.message);
  console.log('\n');
}

// Step 2: Check if we can link and pull config
console.log('🔧 Step 2: Verifying Project Link...\n');
try {
  execSync('vercel link --yes', { stdio: 'pipe' });
  console.log('✅ Project linked successfully\n');
} catch (e) {
  console.log('⚠️  Project link check failed\n');
}

// Step 3: Try to pull environment and verify
console.log('🔧 Step 3: Pulling Vercel Configuration...\n');
try {
  execSync('vercel pull --yes', { stdio: 'pipe' });
  console.log('✅ Configuration pulled successfully\n');
} catch (e) {
  console.log('⚠️  Could not pull configuration\n');
}

// Step 4: List recent deployments
console.log('🔧 Step 4: Checking Recent Deployments...\n');
try {
  const output = execSync('vercel list --limit=3', { encoding: 'utf-8' });
  console.log(output);
} catch (e) {
  console.log('⚠️  Could not list deployments (authentication required)\n');
  console.log('   To fix: Run "vercel login" first\n');
}

// Step 5: Final recommendation
console.log('\n📋 Summary & Next Steps:\n');
console.log('1. If deployment failed, run: vercel login');
console.log('2. Then run: vercel deploy --prod --yes');
console.log('3. Or check GitHub Actions: https://github.com/patrickd12345/bookiji/actions');
console.log('4. Verify in Vercel Dashboard: https://vercel.com/team_QagTypZXKEbPx8eydWnvEl3v/bookijibck\n');

console.log('💡 Alternative: The deployment may trigger automatically via GitHub integration.');
console.log('   Check GitHub Actions to see if workflows are running.\n');
