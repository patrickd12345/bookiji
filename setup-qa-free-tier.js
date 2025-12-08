#!/usr/bin/env node
/**
 * Setup QA Environment for Vercel Free Tier
 * 
 * On free tier, we use:
 * - qa branch → Preview deployments (QA environment)
 * - bookiji branch → Production deployments
 * 
 * This approach works with free tier limitations.
 */

import { execSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import os from 'node:os';

console.log('🚀 Setting up QA Environment using Preview Deployments...\n');
console.log('📋 Approach: QA uses Preview deployments (stays named "Preview" in Vercel)\n');
console.log('            Production = Production deployments from bookiji branch\n');

// Read project
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const projectId = project.projectId;
const orgId = project.orgId;
const projectName = project.projectName;

console.log(`Project: ${projectName} (${projectId})\n`);

// Step 1: Ensure QA branch exists
console.log('Step 1: Ensuring QA branch exists...');
try {
  execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
  console.log('✅ QA branch exists\n');
} catch {
  console.log('Creating QA branch...');
  try {
    execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'pipe' });
    execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'pipe' });
    console.log('✅ QA branch created and pushed\n');
  } catch (err) {
    console.log(`⚠️  Could not create QA branch: ${err.message}\n`);
  }
}

// Step 2: Verify production branch is bookiji (not qa)
console.log('Step 2: Verifying production branch configuration...');

// Get token
let token = process.env.VERCEL_TOKEN;
if (!token) {
  const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
  token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token;
}

// API function
function api(method, endpoint, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vercel.com',
      path: endpoint,
      method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch (e) {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

(async () => {
  try {
    const current = await api('GET', `/v9/projects/${projectId}`);
    const currentBranch = current.data.link?.productionBranch || 'not set';
    
    console.log(`Current production branch: ${currentBranch}`);
    
    if (currentBranch === 'bookiji') {
      console.log('✅ Production branch is correctly set to "bookiji"\n');
    } else if (currentBranch === 'qa') {
      console.log('⚠️  Production branch is set to "qa"');
      console.log('   For free tier, we should use "bookiji" as production.');
      console.log('   Updating production branch to "bookiji"...\n');
      
      const update = await api('PATCH', `/v9/projects/${projectId}`, {
        link: {
          ...current.data.link,
          productionBranch: 'bookiji'
        }
      });
      
      if (update.status === 200) {
        console.log('✅ Production branch updated to "bookiji"\n');
      } else {
        console.log(`⚠️  Could not update: ${update.status}`);
        console.log('   Please update manually in Vercel Dashboard\n');
      }
    } else {
      console.log(`⚠️  Production branch is "${currentBranch}"`);
      console.log('   Consider setting it to "bookiji" for production\n');
    }
    
    console.log('📋 Configuration Summary:');
    console.log('   • Production branch: bookiji → Production deployments');
    console.log('   • QA branch: qa → Preview deployments (serves as QA)');
    console.log('   • Preview name: Stays as "Preview" in Vercel (not renamed)');
    console.log('   • Deployment hooks: Deploy to qa branch (creates Preview)');
    console.log('   • Promotion: Merge qa → bookiji to deploy to production');
    console.log(`\n🔗 Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
    console.log('\n✅ QA environment setup complete!');
    console.log('   Preview deployments from qa branch = QA environment');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  }
})();
