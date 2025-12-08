#!/usr/bin/env node
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import https from 'node:https';

const OUTPUT_FILE = 'qa-setup-execution-result.txt';
const logs = [];

function log(msg) {
  console.log(msg);
  logs.push(msg);
}

log('🚀 Executing QA Environment Setup...\n');

// Read project
const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const projectId = project.projectId;
const orgId = project.orgId;
const projectName = project.projectName;

log(`Project: ${projectName} (${projectId})\n`);

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
    // Create QA branch
    log('Step 1: Ensuring QA branch exists...');
    try {
      execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
      log('✅ QA branch exists\n');
    } catch {
      log('Creating QA branch...');
      execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'pipe' });
      execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'pipe' });
      log('✅ QA branch created\n');
    }

    // Get current project
    log('Step 2: Fetching current configuration...');
    const current = await api('GET', `/v9/projects/${projectId}`);
    const currentBranch = current.data.link?.productionBranch || 'not set';
    log(`Current production branch: ${currentBranch}\n`);

    if (currentBranch === 'qa') {
      log('✅ QA is already the production branch!');
      log(`Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
      fs.writeFileSync(OUTPUT_FILE, logs.join('\n'));
      process.exit(0);
    }

    // Update
    log('Step 3: Updating production branch to QA...');
    const update = await api('PATCH', `/v9/projects/${projectId}`, {
      link: {
        ...current.data.link,
        productionBranch: 'qa'
      }
    });

    log(`Update status: ${update.status}`);
    if (update.status !== 200) {
      log(`Update response: ${JSON.stringify(update.data, null, 2)}`);
    }

    // Verify
    log('\nStep 4: Verifying...');
    const verify = await api('GET', `/v9/projects/${projectId}`);
    const newBranch = verify.data.link?.productionBranch;
    log(`Production branch: ${newBranch}`);

    if (newBranch === 'qa') {
      log('\n✅ SUCCESS! QA is now the production branch.');
      log(`\n📋 Configuration:`);
      log(`   • Production branch: qa`);
      log(`   • Deployments to "qa" → QA environment`);
      log(`   • Deployments to "bookiji" → Preview`);
      log(`\n🔗 Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
    } else {
      log(`\n⚠️  Branch is "${newBranch}", expected "qa"`);
      log('   Please update manually in Vercel Dashboard');
      log(`   https://vercel.com/${orgId}/${projectName}/settings/git`);
    }

    // Write output file
    fs.writeFileSync(OUTPUT_FILE, logs.join('\n'));
    log(`\n📄 Full log saved to: ${OUTPUT_FILE}`);

  } catch (error) {
    log(`\n❌ Error: ${error.message}`);
    if (error.stack) log(`Stack: ${error.stack}`);
    fs.writeFileSync(OUTPUT_FILE, logs.join('\n'));
    process.exit(1);
  }
})();
