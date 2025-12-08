#!/usr/bin/env node
/**
 * Setup QA Environment in Vercel
 * 
 * This script:
 * 1. Creates QA branch if it doesn't exist
 * 2. Updates Vercel production branch to 'qa' using the API
 * 3. Verifies the configuration
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
const resultFile = path.join(process.cwd(), 'qa-setup-result.json');

// Read project config
let projectId, orgId, projectName;
try {
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  projectId = project.projectId;
  orgId = project.orgId;
  projectName = project.projectName;
} catch (e) {
  console.error('❌ Could not read .vercel/project.json');
  console.error('   Run: vercel link');
  process.exit(1);
}

// Get Vercel token
let token = process.env.VERCEL_TOKEN;
if (!token) {
  try {
    const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
    if (fs.existsSync(authPath)) {
      token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token;
    }
  } catch (e) {
    // Ignore
  }
}

if (!token) {
  console.error('❌ VERCEL_TOKEN not found. Run: vercel login');
  process.exit(1);
}

// Vercel API helper
function vercelAPI(method, endpoint, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: endpoint,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
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

async function main() {
  const result = {
    success: false,
    steps: [],
    error: null,
    dashboardUrl: `https://vercel.com/${orgId}/${projectName}/settings/git`
  };

  try {
    console.log('🚀 Setting up QA Environment\n');
    console.log(`Project: ${projectName} (${projectId})\n`);

    // Step 1: Get current project
    console.log('Step 1: Fetching current project...');
    const project = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (project.status !== 200) {
      throw new Error(`Failed to fetch project: ${project.status}`);
    }

    const currentBranch = project.data.link?.productionBranch || 'not set';
    console.log(`   Current production branch: ${currentBranch}\n`);
    result.steps.push({ step: 1, status: 'ok', message: `Current branch: ${currentBranch}` });

    // Step 2: Create QA branch
    console.log('Step 2: Ensuring QA branch exists...');
    try {
      execSync('git rev-parse --verify origin/qa', { stdio: 'ignore' });
      console.log('   ✅ QA branch exists\n');
      result.steps.push({ step: 2, status: 'ok', message: 'QA branch exists' });
    } catch (e) {
      try {
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        execSync('git checkout -b qa', { stdio: 'inherit' });
        execSync('git push -u origin qa', { stdio: 'inherit' });
        console.log('   ✅ QA branch created and pushed\n');
        result.steps.push({ step: 2, status: 'ok', message: 'QA branch created' });
      } catch (err) {
        console.log('   ⚠️  Could not create QA branch automatically');
        console.log('   Please run: git checkout -b qa && git push origin qa\n');
        result.steps.push({ step: 2, status: 'warning', message: 'QA branch creation skipped' });
      }
    }

    // Step 3: Update production branch
    console.log('Step 3: Updating production branch to QA...');
    
    // Try method 1: Branch endpoint (undocumented but used by dashboard)
    let updateSuccess = false;
    try {
      const branchUpdate = await vercelAPI('PATCH', `/v9/projects/${projectId}/branch`, {
        productionBranch: 'qa'
      });
      
      if (branchUpdate.status === 200 || branchUpdate.status === 204) {
        updateSuccess = true;
        console.log('   ✅ Updated using branch endpoint\n');
        result.steps.push({ step: 3, status: 'ok', method: 'branch-endpoint' });
      }
    } catch (e) {
      // Try next method
    }

    // Try method 2: Full project update
    if (!updateSuccess) {
      try {
        const projectUpdate = await vercelAPI('PATCH', `/v9/projects/${projectId}`, {
          link: {
            ...project.data.link,
            productionBranch: 'qa'
          }
        });
        
        if (projectUpdate.status === 200) {
          updateSuccess = true;
          console.log('   ✅ Updated using project endpoint\n');
          result.steps.push({ step: 3, status: 'ok', method: 'project-endpoint' });
        }
      } catch (e) {
        // Continue to verification
      }
    }

    if (!updateSuccess) {
      console.log('   ⚠️  API update may have failed');
      console.log('   Manual update may be required in Vercel Dashboard\n');
      result.steps.push({ step: 3, status: 'warning', message: 'API update uncertain' });
    }

    // Step 4: Verify
    console.log('Step 4: Verifying configuration...');
    const verify = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (verify.status === 200) {
      const newBranch = verify.data.link?.productionBranch;
      console.log(`   Production branch: ${newBranch}`);
      
      if (newBranch === 'qa') {
        console.log('   ✅ QA is now the production branch!\n');
        result.success = true;
        result.steps.push({ step: 4, status: 'ok', message: 'Verified: QA is production branch' });
      } else {
        console.log(`   ⚠️  Branch is "${newBranch}", expected "qa"`);
        console.log('   Please update manually in Vercel Dashboard\n');
        result.steps.push({ step: 4, status: 'warning', message: `Branch is ${newBranch}, not qa` });
      }
    }

    // Write result
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));

    // Summary
    console.log('📋 Summary:');
    console.log(`   • Production branch: ${verify.data.link?.productionBranch || 'unknown'}`);
    console.log(`   • Dashboard: ${result.dashboardUrl}`);
    console.log(`   • Result file: ${resultFile}\n`);

    if (result.success) {
      console.log('✅ QA environment setup complete!');
      console.log('\nNext steps:');
      console.log('   1. Push changes to "qa" branch to deploy to QA');
      console.log('   2. Test QA environment');
      console.log('   3. When ready, change production branch back to "bookiji" in dashboard');
    } else {
      console.log('⚠️  Setup completed with warnings');
      console.log('   Please verify in Vercel Dashboard and update manually if needed');
    }

  } catch (error) {
    result.error = error.message;
    result.steps.push({ step: 'error', status: 'error', message: error.message });
    fs.writeFileSync(resultFile, JSON.stringify(result, null, 2));
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

main();
