#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

// Read project configuration
const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
const outputFile = path.join(process.cwd(), 'qa-setup-output.txt');

function log(message) {
  console.log(message);
  fs.appendFileSync(outputFile, message + '\n');
}

try {
  fs.writeFileSync(outputFile, 'QA Environment Setup Log\n' + '='.repeat(50) + '\n\n');
} catch (e) {
  // Ignore if file write fails
}

let projectId, orgId, projectName;

try {
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  projectId = project.projectId;
  orgId = project.orgId;
  projectName = project.projectName;
  log('📋 Project Configuration:');
  log(`   Project ID: ${projectId}`);
  log(`   Org ID: ${orgId}`);
  log(`   Project Name: ${projectName}\n`);
} catch (e) {
  log('❌ Could not read .vercel/project.json');
  log('   Run: vercel link');
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
      log('✅ Found Vercel authentication token\n');
    }
  } catch (e) {
    log('⚠️  Could not read auth token from ~/.vercel/auth.json');
  }
}

if (!token) {
  log('❌ VERCEL_TOKEN not found. Please run: vercel login');
  log('   Or set VERCEL_TOKEN environment variable');
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

async function configureQA() {
  log('🚀 Configuring QA Environment in Vercel...\n');

  try {
    // Step 1: Get current project
    log('=== Step 1: Fetching Current Project ===');
    const project = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (project.status !== 200) {
      log(`❌ Failed to fetch project: ${project.status}`);
      log(`Response: ${JSON.stringify(project.data, null, 2)}`);
      process.exit(1);
    }

    const p = project.data;
    const currentBranch = p.link?.productionBranch || 'not set';
    log(`   Current Production Branch: ${currentBranch}`);
    log(`   Git Repository: ${p.link?.repo || 'Not linked'}\n`);

    if (!p.link) {
      log('❌ Project is not linked to a Git repository');
      log('   Please link the project first in Vercel Dashboard');
      process.exit(1);
    }

    // Step 2: Update production branch to QA
    log('=== Step 2: Updating Production Branch to QA ===');
    
    // The API expects the full link object, so we need to preserve existing link properties
    const updateData = {
      link: {
        ...p.link,
        productionBranch: 'qa'
      }
    };

    log(`   Sending PATCH request to /v9/projects/${projectId}`);
    log(`   Payload: ${JSON.stringify(updateData, null, 2)}\n`);

    const update = await vercelAPI('PATCH', `/v9/projects/${projectId}`, updateData);
    
    log(`   Response Status: ${update.status}`);
    log(`   Response: ${JSON.stringify(update.data, null, 2)}\n`);

    if (update.status === 200) {
      log('   ✅ Production branch updated to "qa"');
      log('   📍 All deployments to "qa" branch will now be production deployments\n');
    } else {
      log(`   ❌ Failed to update production branch: ${update.status}`);
      log(`   Error: ${JSON.stringify(update.data, null, 2)}`);
      log('\n   ℹ️  Alternative: Update manually in Vercel Dashboard:');
      log(`   https://vercel.com/${orgId}/${projectName}/settings/git\n`);
      
      // Try alternative API endpoint
      log('   🔄 Trying alternative API approach...\n');
      
      // Some Vercel projects use a different endpoint for git settings
      // Try updating just the productionBranch
      const altUpdate = await vercelAPI('PATCH', `/v9/projects/${projectId}`, {
        productionBranch: 'qa'
      });
      
      log(`   Alternative Response Status: ${altUpdate.status}`);
      if (altUpdate.status === 200) {
        log('   ✅ Alternative method succeeded!\n');
      } else {
        log(`   ❌ Alternative method also failed: ${altUpdate.status}\n`);
        process.exit(1);
      }
    }

    // Step 3: Verify
    log('=== Step 3: Verifying Configuration ===');
    const verify = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (verify.status === 200) {
      const verified = verify.data;
      const newBranch = verified.link?.productionBranch;
      log(`   Production Branch: ${newBranch}`);
      
      if (newBranch === 'qa') {
        log('   ✅ QA environment is now configured as production!\n');
        log('📋 Summary:');
        log('   • Production branch in Vercel: qa');
        log('   • All deployments to "qa" branch → QA environment (Vercel production)');
        log('   • All deployments to "bookiji" branch → Preview deployments');
        log('\n🎯 Next Steps:');
        log('   1. Ensure QA branch exists: git checkout -b qa && git push origin qa');
        log('   2. Push changes to "qa" branch to deploy to QA');
        log('   3. Test QA environment thoroughly');
        log('   4. When ready, change production branch back to "bookiji" in Vercel Dashboard');
        log(`      https://vercel.com/${orgId}/${projectName}/settings/git\n`);
      } else {
        log(`   ⚠️  Production branch is "${newBranch}", expected "qa"`);
      }
    }

    log('\n✅ Configuration complete!');
    log(`📄 Full log saved to: ${outputFile}`);

  } catch (error) {
    log(`❌ Error: ${error.message}`);
    log(error.stack);
    process.exit(1);
  }
}

configureQA();
