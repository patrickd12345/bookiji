#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const RESULT_FILE = 'qa-setup-complete.json';

const result = {
  timestamp: new Date().toISOString(),
  steps: [],
  success: false,
  error: null
};

function step(name, status, message) {
  const stepResult = { name, status, message, time: new Date().toISOString() };
  result.steps.push(stepResult);
  console.log(`[${status}] ${name}: ${message}`);
}

try {
  console.log('🚀 Setting up QA Environment in Vercel...\n');

  // Step 1: Ensure QA branch
  step('QA Branch Check', 'running', 'Checking if QA branch exists...');
  try {
    execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
    step('QA Branch Check', 'success', 'QA branch exists');
  } catch (e) {
    step('QA Branch Check', 'running', 'Creating QA branch...');
    try {
      const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
      execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'pipe' });
      execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'pipe' });
      step('QA Branch Check', 'success', 'QA branch created and pushed');
    } catch (err) {
      step('QA Branch Check', 'warning', `Could not create: ${err.message}`);
    }
  }

  // Step 2: Read project config
  step('Project Config', 'running', 'Reading Vercel project configuration...');
  const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
  const projectId = project.projectId;
  const orgId = project.orgId;
  const projectName = project.projectName;
  step('Project Config', 'success', `Project: ${projectName} (${projectId})`);

  // Step 3: Get Vercel token
  step('Authentication', 'running', 'Getting Vercel token...');
  let token = process.env.VERCEL_TOKEN;
  if (!token) {
    const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    token = auth.token;
  }
  step('Authentication', 'success', 'Token found');

  // Step 4: API function
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

  // Step 5: Get current project
  step('Fetch Project', 'running', 'Fetching current Vercel project...');
  const current = await api('GET', `/v9/projects/${projectId}`);
  
  if (current.status !== 200) {
    step('Fetch Project', 'error', `Failed: ${current.status}`);
    throw new Error(`Failed to fetch project: ${current.status}`);
  }
  
  const currentBranch = current.data.link?.productionBranch || 'not set';
  step('Fetch Project', 'success', `Current production branch: ${currentBranch}`);
  
  if (currentBranch === 'qa') {
    step('Update Branch', 'success', 'QA is already the production branch!');
    result.success = true;
    result.dashboardUrl = `https://vercel.com/${orgId}/${projectName}/settings/git`;
    fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
    console.log('\n✅ QA is already configured!');
    process.exit(0);
  }

  // Step 6: Update production branch
  step('Update Branch', 'running', 'Updating production branch to QA...');
  const update = await api('PATCH', `/v9/projects/${projectId}`, {
    link: {
      ...current.data.link,
      productionBranch: 'qa'
    }
  });
  
  step('Update Branch', update.status === 200 ? 'success' : 'warning', 
    `Update response: ${update.status}`);

  // Step 7: Verify
  step('Verify', 'running', 'Verifying configuration...');
  const verify = await api('GET', `/v9/projects/${projectId}`);
  
  if (verify.status === 200) {
    const newBranch = verify.data.link?.productionBranch;
    if (newBranch === 'qa') {
      step('Verify', 'success', 'QA is now the production branch!');
      result.success = true;
      result.productionBranch = 'qa';
      result.dashboardUrl = `https://vercel.com/${orgId}/${projectName}/settings/git`;
    } else {
      step('Verify', 'warning', `Branch is "${newBranch}", expected "qa"`);
      result.productionBranch = newBranch;
    }
  }

  // Save result
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  
  if (result.success) {
    console.log('\n✅ SUCCESS! QA environment is configured!');
    console.log(`📋 Production branch: qa`);
    console.log(`🔗 Dashboard: ${result.dashboardUrl}`);
    console.log(`📄 Result saved to: ${RESULT_FILE}`);
  } else {
    console.log('\n⚠️  Setup completed with warnings');
    console.log('   Please verify in Vercel Dashboard');
    console.log(`   ${result.dashboardUrl || `https://vercel.com/${orgId}/${projectName}/settings/git`}`);
  }

} catch (error) {
  result.error = error.message;
  result.steps.push({ name: 'Error', status: 'error', message: error.message });
  fs.writeFileSync(RESULT_FILE, JSON.stringify(result, null, 2));
  console.error('\n❌ Error:', error.message);
  process.exit(1);
}
