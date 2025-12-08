#!/usr/bin/env node
/**
 * Quick verification script for QA setup
 * Run this to check if QA environment is properly configured
 */

import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const outputFile = 'qa-verification-result.txt';
const output = [];

function log(msg) {
  console.log(msg);
  output.push(msg);
}

log('🔍 Verifying QA Environment Setup...\n');

// Check QA branch
log('1. Checking QA branch...');
try {
  execSync('git rev-parse --verify origin/qa', { encoding: 'utf8', stdio: 'ignore' });
  log('   ✅ QA branch exists\n');
} catch (e) {
  log('   ❌ QA branch does not exist');
  log('   Run: git checkout -b qa && git push origin qa\n');
}

// Check Vercel config
log('2. Checking Vercel configuration...');
try {
  const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
  const projectId = project.projectId;
  const orgId = project.orgId;
  const projectName = project.projectName;
  
  log(`   Project: ${projectName} (${projectId})`);
  
  // Get token
  let token = process.env.VERCEL_TOKEN;
  if (!token) {
    try {
      const authPath = path.join(os.homedir(), '.vercel', 'auth.json');
      token = JSON.parse(fs.readFileSync(authPath, 'utf8')).token;
    } catch (e) {
      log('   ⚠️  Could not get Vercel token');
      log('   Run: vercel login\n');
      fs.writeFileSync(outputFile, output.join('\n'));
      process.exit(0);
    }
  }
  
  // Check production branch
  const apiCall = (method, endpoint) => {
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
      req.end();
    });
  };
  
  apiCall('GET', `/v9/projects/${projectId}`).then(result => {
    if (result.status === 200) {
      const branch = result.data.link?.productionBranch || 'not set';
      log(`   Production branch: ${branch}`);
      
      if (branch === 'qa') {
        log('   ✅ QA is the production branch!\n');
        log('✅ QA environment is properly configured!');
        log(`\nDashboard: https://vercel.com/${orgId}/${projectName}/settings/git`);
      } else {
        log(`   ⚠️  Production branch is "${branch}", expected "qa"`);
        log(`\n   To fix: Run node execute-qa-setup.js`);
        log(`   Or update manually: https://vercel.com/${orgId}/${projectName}/settings/git\n`);
      }
    } else {
      log(`   ⚠️  Could not fetch project: ${result.status}`);
      log(`   Response: ${JSON.stringify(result.data, null, 2)}`);
    }
    fs.writeFileSync(outputFile, output.join('\n'));
  }).catch(err => {
    log(`   ⚠️  API error: ${err.message}`);
    log(`   Stack: ${err.stack}`);
    fs.writeFileSync(outputFile, output.join('\n'));
  });
  
} catch (e) {
  log(`   ❌ Error: ${e.message}`);
  fs.writeFileSync(outputFile, output.join('\n'));
}
