#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

// Write all output to file
const logFile = 'qa-configuration-result.txt';
const logs = [];

function log(msg) {
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${msg}`;
  logs.push(line);
  console.log(msg);
}

// Ensure QA branch exists
log('Step 1: Ensuring QA branch exists...');
try {
  execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
  log('✅ QA branch exists');
} catch (e) {
  log('Creating QA branch...');
  try {
    execSync('git checkout -b qa', { encoding: 'utf8', stdio: 'pipe' });
    execSync('git push -u origin qa', { encoding: 'utf8', stdio: 'pipe' });
    log('✅ QA branch created and pushed');
  } catch (err) {
    log(`⚠️  Could not create QA branch: ${err.message}`);
  }
}

// Read project config
const projectPath = path.join(process.cwd(), '.vercel', 'project.json');
const project = JSON.parse(fs.readFileSync(projectPath, 'utf8'));
const projectId = project.projectId;
const orgId = project.orgId;
const projectName = project.projectName;

log(`\nProject: ${projectName} (${projectId})`);

// Get token
let token = process.env.VERCEL_TOKEN;
if (!token) {
  try {
    const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
    const auth = JSON.parse(fs.readFileSync(authPath, 'utf8'));
    token = auth.token;
    log('✅ Found Vercel token');
  } catch (e) {
    log('❌ Could not find Vercel token. Run: vercel login');
    fs.writeFileSync(logFile, logs.join('\n'));
    process.exit(1);
  }
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
    log('\nStep 2: Fetching current project configuration...');
    const current = await api('GET', `/v9/projects/${projectId}`);
    
    if (current.status !== 200) {
      log(`❌ Failed to fetch project: ${current.status}`);
      fs.writeFileSync(logFile, logs.join('\n'));
      process.exit(1);
    }
    
    const currentBranch = current.data.link?.productionBranch || 'not set';
    log(`Current production branch: ${currentBranch}`);
    
    if (currentBranch === 'qa') {
      log('\n✅ QA is already the production branch!');
      log(`Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
      fs.writeFileSync(logFile, logs.join('\n'));
      process.exit(0);
    }
    
    log('\nStep 3: Updating production branch to QA...');
    
    // Try updating the project
    const update = await api('PATCH', `/v9/projects/${projectId}`, {
      link: {
        ...current.data.link,
        productionBranch: 'qa'
      }
    });
    
    log(`Update response status: ${update.status}`);
    
    if (update.status === 200) {
      log('✅ Update successful!');
    } else {
      log(`⚠️  Update returned status ${update.status}`);
      log(`Response: ${JSON.stringify(update.data, null, 2)}`);
    }
    
    log('\nStep 4: Verifying...');
    const verify = await api('GET', `/v9/projects/${projectId}`);
    
    if (verify.status === 200) {
      const newBranch = verify.data.link?.productionBranch;
      log(`Production branch: ${newBranch}`);
      
      if (newBranch === 'qa') {
        log('\n✅ SUCCESS! QA is now the production branch.');
        log(`\n📋 Configuration:`);
        log(`   • Production branch: qa`);
        log(`   • Deployments to "qa" → QA environment (Vercel production)`);
        log(`   • Deployments to "bookiji" → Preview deployments`);
        log(`\n🔗 Dashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
      } else {
        log(`\n⚠️  Branch is "${newBranch}", expected "qa"`);
        log('   You may need to update manually in Vercel Dashboard');
      }
    }
    
    // Write log file
    fs.writeFileSync(logFile, logs.join('\n'));
    log(`\n📄 Full log saved to: ${logFile}`);
    
  } catch (error) {
    log(`\n❌ Error: ${error.message}`);
    fs.writeFileSync(logFile, logs.join('\n'));
    process.exit(1);
  }
})();
