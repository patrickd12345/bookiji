#!/usr/bin/env node
import { spawn } from 'node:child_process';
import fs from 'node:fs';

function printProjectInfo() {
  console.log('\ndY"< Project Configuration:');
  try {
    const project = JSON.parse(fs.readFileSync('.vercel/project.json', 'utf8'));
    console.log(`   Project: ${project.projectName}`);
    console.log(`   Project ID: ${project.projectId}`);
    console.log(`   Dashboard: https://vercel.com/${project.orgId}/${project.projectName}`);
  } catch {
    console.log('   Could not read project.json');
  }
}

function startAsyncDeployment() {
  console.log('dYs? Triggering Vercel Deployment (Preview)\n');
  console.log('ƒo. Starting deployment to bookiji branch (creates Preview deployment) in background...');
  console.log('   This script will exit immediately; build continues on Vercel.\n');
  console.log('   Note: Deploys to bookiji branch → Preview deployment (QA environment).');
  console.log('         Preview stays named "Preview" in Vercel. Promote manually in Dashboard.\n');

  // Deploy to bookiji branch - creates Preview deployment (stays named "Preview" in Vercel)
  // This preview deployment serves as our QA environment
  // User manually promotes Preview → Production in Vercel Dashboard
  const child = spawn('vercel', ['deploy', '--yes'], {
    shell: true,
    detached: true,
    stdio: 'ignore',
  });

  // Detach so the CLI keeps running after this script exits
  child.unref();
}

function runAndWaitForDeployment() {
  console.log('dYs? Triggering Vercel Deployment (Preview)\n');
  console.log('ƒo. Streaming Vercel CLI output until deployment finishes...\n');
  console.log('   Note: Deploys to bookiji branch → Preview deployment (QA environment).');
  console.log('         Preview stays named "Preview" in Vercel. Promote manually in Dashboard.\n');

  return new Promise((resolve, reject) => {
    // Deploy to bookiji branch - creates Preview deployment (stays named "Preview" in Vercel)
    // This preview deployment serves as our QA environment
    // User manually promotes Preview → Production in Vercel Dashboard
    const child = spawn('vercel', ['deploy', '--yes'], {
      shell: true,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    child.stdout.on('data', (data) => {
      process.stdout.write(data);
    });

    child.stderr.on('data', (data) => {
      process.stderr.write(data);
    });

    child.on('error', (err) => {
      console.error('\nƒ?O Failed to start Vercel CLI:', err.message);
      reject(err);
    });

    child.on('close', (code) => {
      if (code === 0) {
        console.log('\nƒo. Deployment process finished successfully.');
        resolve();
      } else {
        console.error(`\nƒ?O Deployment process exited with code: ${code}`);
        reject(new Error(`Vercel CLI exited with code ${code}`));
      }
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const waitForBuild = args.includes('--wait');

  if (waitForBuild) {
    await runAndWaitForDeployment();
  } else {
    startAsyncDeployment();
  }

  printProjectInfo();
}

main().catch((err) => {
  console.error('\nƒ?O Error during deployment:', err.message);
  process.exit(1);
});

