#!/usr/bin/env node
// Simple script to update Vercel production branch to QA
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const outputFile = 'vercel-qa-setup-output.txt';

function log(msg) {
  console.log(msg);
  fs.appendFileSync(outputFile, msg + '\n');
}

try {
  fs.writeFileSync(outputFile, 'Vercel QA Setup Output\n' + '='.repeat(50) + '\n\n');
} catch (e) {}

const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const projectId = project.projectId;
const orgId = project.orgId;
const projectName = project.projectName;

log(`Project: ${projectName} (${projectId})`);
log(`Org: ${orgId}\n`);

// Get token
let token = process.env.VERCEL_TOKEN;
if (!token) {
  try {
    const auth = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.vercel', 'auth.json'), 'utf8'));
    token = auth.token;
    log('✅ Found Vercel token\n');
  } catch (e) {
    log('❌ Could not find Vercel token');
    log('   Run: vercel login');
    process.exit(1);
  }
}

function api(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vercel.com',
      path,
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
  log('🚀 Setting up QA Environment in Vercel...\n');
  
  // Step 1: Ensure QA branch exists
  log('Step 1: Checking QA branch...');
  try {
    execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
    log('   ✅ QA branch exists\n');
  } catch (e) {
    log('   ⚠️  QA branch does not exist, creating...');
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'inherit' });
      execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'inherit' });
      log('   ✅ QA branch created and pushed\n');
    } catch (err) {
      log(`   ❌ Failed to create QA branch: ${err.message}`);
      log('   Please run manually: git checkout -b qa && git push origin qa\n');
    }
  }
  
  // Step 2: Get current project
  log('Step 2: Fetching current Vercel project...');
  const project = await api('GET', `/v9/projects/${projectId}`);
  
  if (project.status !== 200) {
    log(`❌ Failed to fetch project: ${project.status}`);
    log(`Response: ${JSON.stringify(project.data, null, 2)}`);
    process.exit(1);
  }
  
  const currentBranch = project.data.link?.productionBranch || 'not set';
  log(`   Current production branch: ${currentBranch}\n`);
  
  if (currentBranch === 'qa') {
    log('✅ QA is already the production branch!');
    log(`Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
    process.exit(0);
  }
  
  // Step 3: Update production branch
  log('Step 3: Updating production branch to QA...');
  
  // Try method 1: Branch endpoint
  let success = false;
  try {
    const update1 = await api('PATCH', `/v9/projects/${projectId}/branch`, { productionBranch: 'qa' });
    if (update1.status === 200 || update1.status === 204) {
      log('   ✅ Updated via branch endpoint\n');
      success = true;
    } else {
      log(`   Branch endpoint returned: ${update1.status}`);
    }
  } catch (e) {
    log(`   Branch endpoint error: ${e.message}`);
  }
  
  // Try method 2: Project endpoint
  if (!success) {
    try {
      const update2 = await api('PATCH', `/v9/projects/${projectId}`, {
        link: { ...project.data.link, productionBranch: 'qa' }
      });
      if (update2.status === 200) {
        log('   ✅ Updated via project endpoint\n');
        success = true;
      } else {
        log(`   Project endpoint returned: ${update2.status}`);
        log(`   Response: ${JSON.stringify(update2.data, null, 2)}`);
      }
    } catch (e) {
      log(`   Project endpoint error: ${e.message}`);
    }
  }
  
  if (!success) {
    log('\n⚠️  Could not update via API');
    log('   Please update manually in Vercel Dashboard:');
    log(`   https://vercel.com/${orgId}/${projectName}/settings/git`);
    log('\n   Steps:');
    log('   1. Go to Settings → Git');
    log('   2. Change Production Branch to "qa"');
    log('   3. Save');
    process.exit(1);
  }
  
  // Step 4: Verify
  log('Step 4: Verifying configuration...');
  const verify = await api('GET', `/v9/projects/${projectId}`);
  
  if (verify.status === 200) {
    const newBranch = verify.data.link?.productionBranch;
    log(`   Production branch: ${newBranch}`);
    
    if (newBranch === 'qa') {
      log('\n✅ SUCCESS! QA is now the production branch.');
      log(`\n📋 Summary:`);
      log(`   • Production branch: qa`);
      log(`   • All deployments to "qa" → QA environment (Vercel production)`);
      log(`   • All deployments to "bookiji" → Preview deployments`);
      log(`\n🔗 Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
      log(`\n📄 Full log: ${outputFile}`);
    } else {
      log(`\n⚠️  Branch is "${newBranch}", expected "qa"`);
      log('   Please verify in Vercel Dashboard');
    }
  }
})();
