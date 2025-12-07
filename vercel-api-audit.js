#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

console.log('🔍 Vercel CLI Audit via API\n');

// Read project.json
const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
let projectId, orgId, projectName;

try {
  const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
  projectId = project.projectId;
  orgId = project.orgId;
  projectName = project.projectName;
  console.log('✅ Project Linked:');
  console.log(`   Project ID: ${projectId}`);
  console.log(`   Org ID: ${orgId}`);
  console.log(`   Project Name: ${projectName}\n`);
} catch (e) {
  console.error('❌ Could not read .vercel/project.json');
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
    console.log('⚠️  Could not read auth token from ~/.vercel/auth.json');
    console.log('   Please run: vercel login');
    console.log('   Or set VERCEL_TOKEN environment variable\n');
  }
}

if (!token) {
  console.log('⚠️  Cannot proceed without Vercel token');
  console.log('   Run: vercel login');
  process.exit(1);
}

// API request function
function apiRequest(method, path, data = null) {
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
          resolve({ status: res.statusCode, data: JSON.parse(responseData) });
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

// Main audit
async function audit() {
  console.log('=== Step 1: Project Details ===');
  try {
    const project = await apiRequest('GET', `/v9/projects/${projectId}`);
    
    if (project.status === 200) {
      const p = project.data;
      console.log(`✅ Project: ${p.name}`);
      console.log(`   Framework: ${p.framework || 'Not set'}`);
      console.log(`   Node Version: ${p.nodeVersion || 'Not set'}`);
      
      if (p.link) {
        console.log(`\n📋 Git Integration:`);
        console.log(`   Type: ${p.link.type || 'Unknown'}`);
        console.log(`   Repository: ${p.link.repo || 'Not linked'}`);
        console.log(`   Production Branch: ${p.link.productionBranch || 'NOT SET'}`);
        console.log(`   GitHub Installation: ${p.link.gitHubInstallationId ? '✅ Active' : '❌ Not configured'}`);
        
        if (p.link.productionBranch !== 'bookiji') {
          console.log(`\n⚠️  ISSUE FOUND: Production branch is "${p.link.productionBranch || 'not set'}"`);
          console.log(`   Should be: "bookiji"`);
          console.log(`\n   To fix, run:`);
          console.log(`   vercel project update`);
          console.log(`   Then select: bookiji\n`);
        } else {
          console.log(`\n✅ Production branch is correctly set to "bookiji"\n`);
        }
      } else {
        console.log(`\n⚠️  Git integration not configured\n`);
      }
    } else {
      console.log(`❌ Failed: ${project.status}`);
      console.log(project.data);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('=== Step 2: Recent Deployments ===');
  try {
    const deployments = await apiRequest('GET', `/v6/deployments?projectId=${projectId}&limit=10`);
    
    if (deployments.status === 200 && deployments.data.deployments) {
      const deps = deployments.data.deployments;
      console.log(`Found ${deps.length} recent deployments:\n`);
      
      deps.forEach((dep, i) => {
        const branch = dep.meta?.githubCommitRef || dep.meta?.gitBranch || 'N/A';
        const isProd = dep.target === 'production';
        const status = dep.readyState === 'READY' ? '✅' : dep.readyState === 'ERROR' ? '❌' : '⏳';
        
        console.log(`  ${i + 1}. ${status} ${dep.url || dep.name}`);
        console.log(`     Branch: ${branch}`);
        console.log(`     Target: ${dep.target || 'preview'}`);
        console.log(`     State: ${dep.readyState}`);
        console.log(`     Created: ${new Date(dep.createdAt).toLocaleString()}`);
        if (isProd) console.log(`     🎯 PRODUCTION DEPLOYMENT`);
        console.log('');
      });
    } else {
      console.log(`❌ Failed to fetch deployments: ${deployments.status}`);
    }
  } catch (error) {
    console.log(`❌ Error: ${error.message}`);
  }

  console.log('=== Step 3: Project JSON ===');
  try {
    const content = fs.readFileSync(projectPath, 'utf8');
    console.log(content);
  } catch (e) {
    console.log('.vercel/project.json does not exist');
  }
}

audit();


