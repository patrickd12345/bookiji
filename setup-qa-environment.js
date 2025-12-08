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

// Try to get Vercel token
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
    console.log('⚠️  Could not read auth token from ~/.vercel/auth.json');
  }
}

if (!token) {
  console.log('⚠️  VERCEL_TOKEN not found. Please run: vercel login');
  console.log('   Or set VERCEL_TOKEN environment variable');
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

async function setupQAEnvironment() {
  console.log('🚀 Setting up QA Environment in Vercel...\n');

  try {
    // Step 1: Check current project configuration
    console.log('=== Step 1: Checking Current Configuration ===');
    const project = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (project.status !== 200) {
      console.error(`❌ Failed to fetch project: ${project.status}`);
      console.error(project.data);
      process.exit(1);
    }

    const p = project.data;
    const currentBranch = p.link?.productionBranch || 'not set';
    console.log(`   Current Production Branch: ${currentBranch}`);
    console.log(`   Git Repository: ${p.link?.repo || 'Not linked'}\n`);

    // Step 2: Check if QA branch exists
    console.log('=== Step 2: Checking QA Branch ===');
    try {
      const branches = execSync('git branch -r', { encoding: 'utf8' });
      const hasQABranch = branches.includes('origin/qa');
      
      if (!hasQABranch) {
        console.log('   ⚠️  QA branch does not exist remotely');
        console.log('   📝 Creating QA branch...');
        
        // Create QA branch from current branch
        const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
        execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'inherit' });
        execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'inherit' });
        console.log('   ✅ QA branch created and pushed\n');
      } else {
        console.log('   ✅ QA branch exists\n');
      }
    } catch (e) {
      console.error('   ❌ Error checking/creating QA branch:', e.message);
      console.log('   ℹ️  Please create QA branch manually: git checkout -b qa && git push origin qa\n');
    }

    // Step 3: Update production branch to QA
    console.log('=== Step 3: Updating Production Branch to QA ===');
    
    // Get the current link configuration
    const link = p.link;
    if (!link) {
      console.error('   ❌ Project is not linked to a Git repository');
      console.error('   Please link the project first in Vercel Dashboard');
      process.exit(1);
    }

    // Update the production branch using PATCH
    const updateData = {
      productionBranch: 'qa'
    };

    const update = await vercelAPI('PATCH', `/v9/projects/${projectId}`, updateData);
    
    if (update.status === 200) {
      console.log('   ✅ Production branch updated to "qa"');
      console.log('   📍 All deployments to "qa" branch will now be production deployments\n');
    } else {
      console.error(`   ❌ Failed to update production branch: ${update.status}`);
      console.error('   Response:', JSON.stringify(update.data, null, 2));
      console.log('\n   ℹ️  You may need to update this manually in Vercel Dashboard:');
      console.log(`   https://vercel.com/${orgId}/${projectName}/settings/git\n`);
      process.exit(1);
    }

    // Step 4: Verify the change
    console.log('=== Step 4: Verifying Configuration ===');
    const verify = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (verify.status === 200) {
      const verified = verify.data;
      const newBranch = verified.link?.productionBranch;
      console.log(`   Production Branch: ${newBranch}`);
      
      if (newBranch === 'qa') {
        console.log('   ✅ QA environment is now configured as production!\n');
        console.log('📋 Summary:');
        console.log('   • QA branch: origin/qa');
        console.log('   • Production branch in Vercel: qa');
        console.log('   • All deployments to "qa" branch → QA environment (Vercel production)');
        console.log('   • All deployments to "bookiji" branch → Preview deployments');
        console.log('\n🎯 Next Steps:');
        console.log('   1. Push changes to "qa" branch to deploy to QA');
        console.log('   2. Test QA environment thoroughly');
        console.log('   3. When ready, change production branch back to "bookiji" in Vercel Dashboard');
        console.log(`      https://vercel.com/${orgId}/${projectName}/settings/git\n`);
      } else {
        console.log(`   ⚠️  Production branch is "${newBranch}", expected "qa"`);
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

setupQAEnvironment();
