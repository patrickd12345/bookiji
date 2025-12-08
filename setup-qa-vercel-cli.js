#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Read project configuration
const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
let projectId, orgId, projectName;

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
  console.error('   Run: vercel link');
  process.exit(1);
}

// Get Vercel token
let token = process.env.VERCEL_TOKEN;

if (!token) {
  try {
    const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
    if (fs.existsSync(authPath)) {
      const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
      token = auth.token;
      console.log('✅ Found Vercel authentication token\n');
    }
  } catch (e) {
    console.log('⚠️  Could not read auth token');
  }
}

if (!token) {
  console.log('❌ VERCEL_TOKEN not found. Please run: vercel login');
  process.exit(1);
}

// Function to make Vercel API request
function vercelAPI(method, path, data = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.vercel.com',
      path: path,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';
      res.on('data', (chunk) => { responseData += chunk; });
      res.on('end', () => {
        try {
          const parsed = JSON.parse(responseData);
          resolve({ status: res.statusCode, data: parsed });
        } catch (e) {
          resolve({ status: res.statusCode, data: responseData });
        }
      });
    });

    req.on('error', reject);

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

async function setupQA() {
  console.log('🚀 Setting up QA Environment...\n');

  try {
    // Step 1: Get current project
    console.log('=== Step 1: Fetching Current Project ===');
    const project = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (project.status !== 200) {
      console.error(`❌ Failed: ${project.status}`);
      process.exit(1);
    }

    const p = project.data;
    console.log(`   Current Production Branch: ${p.link?.productionBranch || 'not set'}\n`);

    // Step 2: Try to update using the branch endpoint (undocumented but used by dashboard)
    console.log('=== Step 2: Updating Production Branch to QA ===');
    
    // Try the undocumented endpoint that the dashboard uses
    const branchUpdate = await vercelAPI('PATCH', `/v9/projects/${projectId}/branch`, {
      productionBranch: 'qa'
    });
    
    if (branchUpdate.status === 200 || branchUpdate.status === 204) {
      console.log('   ✅ Production branch updated to "qa"!\n');
    } else {
      // Try updating the full project with link object
      console.log('   Trying alternative method...');
      const projectUpdate = await vercelAPI('PATCH', `/v9/projects/${projectId}`, {
        link: {
          ...p.link,
          productionBranch: 'qa'
        }
      });
      
      if (projectUpdate.status === 200) {
        console.log('   ✅ Production branch updated to "qa"!\n');
      } else {
        console.log(`   ⚠️  API update failed (${projectUpdate.status})`);
        console.log('   This may require manual update in Vercel Dashboard\n');
      }
    }

    // Step 3: Verify
    console.log('=== Step 3: Verifying ===');
    const verify = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (verify.status === 200) {
      const newBranch = verify.data.link?.productionBranch;
      console.log(`   Production Branch: ${newBranch}`);
      
      if (newBranch === 'qa') {
        console.log('   ✅ QA is now the production branch!\n');
      } else {
        console.log(`   ⚠️  Branch is "${newBranch}", not "qa"`);
        console.log('   Manual update may be required\n');
      }
    }

    // Step 4: Ensure QA branch exists
    console.log('=== Step 4: Checking QA Branch ===');
    try {
      execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
      console.log('   ✅ QA branch exists\n');
    } catch (e) {
      console.log('   ⚠️  QA branch does not exist');
      console.log('   Creating QA branch...\n');
      try {
        execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'inherit' });
        execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'inherit' });
        console.log('   ✅ QA branch created\n');
      } catch (err) {
        console.log('   ⚠️  Could not create branch automatically');
        console.log('   Please run: git checkout -b qa && git push origin qa\n');
      }
    }

    console.log('📋 Summary:');
    console.log('   • Production branch: qa (in Vercel)');
    console.log('   • All deployments to "qa" → QA environment');
    console.log('   • All deployments to "bookiji" → Preview');
    console.log(`\n🔗 Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

setupQA();
