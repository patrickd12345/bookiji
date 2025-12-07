#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

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
  console.log(`   Project Name: ${projectName}`);
} catch (e) {
  console.error('❌ Could not read .vercel/project.json');
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
      console.log('\n✅ Found Vercel authentication token');
    }
  } catch (e) {
    console.log('\n⚠️  Could not read auth token from ~/.vercel/auth.json');
  }
}

if (!token) {
  console.log('\n⚠️  VERCEL_TOKEN not found. Please run: vercel login');
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

// Main audit function
async function auditVercel() {
  console.log('\n🔍 Auditing Vercel Configuration...\n');

  try {
    // Get project details
    console.log('=== Step 1: Fetching Project Details ===');
    const project = await vercelAPI('GET', `/v9/projects/${projectId}`);
    
    if (project.status === 200) {
      const p = project.data;
      console.log(`✅ Project: ${p.name}`);
      console.log(`   Framework: ${p.framework || 'Not set'}`);
      console.log(`   Node Version: ${p.nodeVersion || 'Not set'}`);
      console.log(`   Git Repository: ${p.link?.repo || 'Not linked'}`);
      console.log(`   Production Branch: ${p.link?.productionBranch || 'Not set'}`);
      
      if (p.link?.productionBranch !== 'bookiji') {
        console.log(`\n⚠️  WARNING: Production branch is "${p.link?.productionBranch || 'not set'}", should be "bookiji"`);
        console.log('   Run: vercel project update');
        console.log('   Then select: bookiji');
      } else {
        console.log(`\n✅ Production branch is correctly set to "bookiji"`);
      }
    } else {
      console.log(`❌ Failed to fetch project: ${project.status}`);
      console.log(project.data);
    }

    // Get deployments
    console.log('\n=== Step 2: Recent Deployments ===');
    const deployments = await vercelAPI('GET', `/v6/deployments?projectId=${projectId}&limit=5`);
    
    if (deployments.status === 200 && deployments.data.deployments) {
      console.log(`Found ${deployments.data.deployments.length} recent deployments:`);
      deployments.data.deployments.forEach((dep, i) => {
        console.log(`\n  ${i + 1}. ${dep.url || dep.name}`);
        console.log(`     Branch: ${dep.meta?.githubCommitRef || 'N/A'}`);
        console.log(`     State: ${dep.readyState}`);
        console.log(`     Created: ${new Date(dep.createdAt).toLocaleString()}`);
        if (dep.target === 'production') {
          console.log(`     🎯 PRODUCTION`);
        }
      });
    }

    // Get Git integration status
    console.log('\n=== Step 3: Git Integration Status ===');
    if (project.status === 200 && project.data.link) {
      const link = project.data.link;
      console.log(`✅ Git Integration: ${link.type || 'Unknown'}`);
      console.log(`   Repository: ${link.repo || 'Not set'}`);
      console.log(`   Production Branch: ${link.productionBranch || 'Not set'}`);
      console.log(`   GitHub Installation ID: ${link.gitHubInstallationId || 'Not set'}`);
      
      if (!link.gitHubInstallationId) {
        console.log(`\n⚠️  WARNING: GitHub webhooks may not be configured`);
      }
    }

    console.log('\n=== Step 4: Project JSON ===');
    const projectJson = fs.readFileSync(projectPath, 'utf8');
    console.log(projectJson);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

auditVercel();


