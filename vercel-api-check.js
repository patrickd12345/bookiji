#!/usr/bin/env node
import https from 'node:https';
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';

// Read project.json
let projectId, orgId;
try {
  const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
  projectId = project.projectId;
  orgId = project.orgId;
  console.log('Project ID:', projectId);
  console.log('Org ID:', orgId);
} catch (e) {
  console.log('Could not read .vercel/project.json');
  process.exit(1);
}

// Try to get Vercel token from environment or CLI
let token = process.env.VERCEL_TOKEN;

if (!token) {
  try {
    // Try to get from vercel whoami or config
    const configPath = os.homedir() + '/.vercel/auth.json';
    if (fs.existsSync(configPath)) {
      const auth = JSON.parse(fs.readFileSync(configPath, 'utf8'));
      token = auth.token;
    }
  } catch (e) {
    console.log('Could not get Vercel token. Please set VERCEL_TOKEN environment variable.');
  }
}

if (token) {
  console.log('\n=== Fetching project details from Vercel API ===');
  
  const options = {
    hostname: 'api.vercel.com',
    path: `/v9/projects/${projectId}`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => { data += chunk; });
    res.on('end', () => {
      try {
        const project = JSON.parse(data);
        console.log('\nProject Details:');
        console.log(JSON.stringify(project, null, 2));
      } catch (e) {
        console.log('Response:', data);
      }
    });
  });

  req.on('error', (e) => {
    console.log('Error:', e.message);
  });

  req.end();
} else {
  console.log('\n=== Running Vercel CLI commands ===');
  
  const commands = [
    { cmd: 'vercel link --yes', desc: 'Step 1: vercel link' },
    { cmd: 'vercel pull --yes', desc: 'Step 2: vercel pull' },
    { cmd: 'vercel inspect', desc: 'Step 3: vercel inspect' },
    { cmd: 'vercel list', desc: 'Step 4: vercel list' },
    { cmd: 'vercel inspect --target production', desc: 'Step 5: vercel inspect --target production' }
  ];

  commands.forEach(({ cmd, desc }) => {
    console.log(`\n=== ${desc} ===`);
    try {
      const output = execSync(cmd, { encoding: 'utf8', stdio: 'pipe', shell: true });
      console.log(output || '(No output)');
    } catch (e) {
      console.log('STDOUT:', e.stdout || '(none)');
      console.log('STDERR:', e.stderr || '(none)');
      console.log('Exit code:', e.status);
    }
  });
}

console.log('\n=== Step 6: .vercel/project.json ===');
try {
  const content = fs.readFileSync('.vercel/project.json', 'utf8');
  console.log(content);
} catch (e) {
  console.log('.vercel/project.json does not exist');
}


