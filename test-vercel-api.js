#!/usr/bin/env node
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
const projectId = project.projectId;

let token = process.env.VERCEL_TOKEN;
if (!token) {
  const auth = JSON.parse(fs.readFileSync(path.join(os.homedir(), '.vercel', 'auth.json'), 'utf8'));
  token = auth.token;
}

function api(method, path, data) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.vercel.com',
      path,
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
    console.log('Testing Vercel API connection...');
    const project = await api('GET', `/v9/projects/${projectId}`);
    console.log(`Status: ${project.status}`);
    console.log(`Current production branch: ${project.data.link?.productionBranch || 'not set'}`);
    
    // Try to update
    console.log('\nAttempting to update production branch to QA...');
    const update = await api('PATCH', `/v9/projects/${projectId}`, {
      link: {
        ...project.data.link,
        productionBranch: 'qa'
      }
    });
    
    console.log(`Update status: ${update.status}`);
    if (update.status === 200) {
      console.log('✅ Success!');
    } else {
      console.log(`Response: ${JSON.stringify(update.data, null, 2)}`);
    }
    
    // Verify
    const verify = await api('GET', `/v9/projects/${projectId}`);
    console.log(`\nVerification - Production branch: ${verify.data.link?.productionBranch}`);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
})();
