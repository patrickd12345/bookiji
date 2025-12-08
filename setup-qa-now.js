#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execSync } from 'node:child_process';

const OUTPUT = 'qa-setup-result.json';

const result = { success: false, steps: [], error: null };

try {
  // Step 1: QA Branch
  try {
    execSync('git rev-parse --verify origin/qa', { stdio: 'ignore' });
    result.steps.push({ step: 'qa-branch', status: 'exists' });
  } catch {
    try {
      execSync('git checkout -b qa', { stdio: 'ignore' });
      execSync('git push -u origin qa', { stdio: 'ignore' });
      result.steps.push({ step: 'qa-branch', status: 'created' });
    } catch (e) {
      result.steps.push({ step: 'qa-branch', status: 'failed', error: e.message });
    }
  }

  // Step 2: Read config
  const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
  const projectId = project.projectId;
  const orgId = project.orgId;
  const projectName = project.projectName;
  result.projectId = projectId;
  result.orgId = orgId;
  result.projectName = projectName;

  // Step 3: Get token
  let token = process.env.VERCEL_TOKEN;
  if (!token) {
    token = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.vercel', 'auth.json'), 'utf8')).token;
  }

  // Step 4: API
  function api(method, endpoint, data) {
    return new Promise((resolve, reject) => {
      const req = https.request({
        hostname: 'api.vercel.com',
        path: endpoint,
        method,
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
      }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            resolve({ status: res.statusCode, data: JSON.parse(body) });
          } catch {
            resolve({ status: res.statusCode, data: body });
          }
        });
      });
      req.on('error', reject);
      if (data) req.write(JSON.stringify(data));
      req.end();
    });
  }

  // Step 5: Get current
  const current = await api('GET', `/v9/projects/${projectId}`);
  const currentBranch = current.data.link?.productionBranch || 'not set';
  result.currentBranch = currentBranch;
  result.steps.push({ step: 'fetch', status: 'ok', branch: currentBranch });

  if (currentBranch === 'qa') {
    result.success = true;
    result.message = 'QA is already the production branch';
  } else {
    // Step 6: Update
    const update = await api('PATCH', `/v9/projects/${projectId}`, {
      link: { ...current.data.link, productionBranch: 'qa' }
    });
    result.steps.push({ step: 'update', status: update.status === 200 ? 'ok' : 'failed', code: update.status });

    // Step 7: Verify
    const verify = await api('GET', `/v9/projects/${projectId}`);
    const newBranch = verify.data.link?.productionBranch;
    result.newBranch = newBranch;
    
    if (newBranch === 'qa') {
      result.success = true;
      result.message = 'QA is now the production branch';
    } else {
      result.message = `Branch is ${newBranch}, expected qa`;
    }
  }

  result.dashboardUrl = `https://vercel.com/${orgId}/${projectName}/settings/git`;

} catch (error) {
  result.error = error.message;
  result.steps.push({ step: 'error', status: 'failed', error: error.message });
}

fs.writeFileSync(OUTPUT, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
