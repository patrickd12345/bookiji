#!/usr/bin/env node
import { execSync, spawn } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';
import { join } from 'path';

const output = [];

function log(...args) {
  const msg = args.join(' ');
  output.push(msg);
  console.log(msg);
}

const baseUrl = process.env.BASE_URL || 'http://localhost:3000';

async function logTimeDiagnostics() {
  const endpoint = new URL('/api/system/time', baseUrl).toString();
  try {
    const response = await fetch(endpoint, { headers: { Accept: 'application/json' } });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const payload = await response.json().catch(() => ({}));
    const serverNow = Number(payload.server_now);
    const serverIso =
      payload.server_now_iso || (Number.isFinite(serverNow) ? new Date(serverNow).toISOString() : 'n/a');
    const offset = payload.server_time_offset ?? payload.server_offset ?? 'n/a';
    log(
      `Time diagnostics: server_now=${Number.isFinite(serverNow) ? serverNow : 'n/a'} (${serverIso}), ` +
        `server_time_offset=${offset}ms`
    );
  } catch (error) {
    log(`Time diagnostics unavailable: ${(error instanceof Error ? error.message : error) || 'unknown error'}`);
  }
}

const cwd = process.cwd();
log(`\n${'='.repeat(60)}`);
log(`PROJECT DIAGNOSTICS - Bookiji`);
log(`Working Directory: ${cwd}`);
log(`Node Version: ${process.version}`);
log(`Timestamp: ${new Date().toISOString()}`);
log(`${'='.repeat(60)}\n`);
await logTimeDiagnostics();

// Test 1: Next.js CLI
try {
  log(`📦 Testing Next.js CLI...`);
  const result = execSync('npx next --version', { encoding: 'utf8', cwd });
  log(`✅ Next.js version: ${result.trim()}`);
} catch (e) {
  log(`❌ Next.js CLI Error: ${e.message}`);
}

// Test 2: TypeScript Check
try {
  log(`\n📋 Running TypeScript type check...`);
  const result = execSync('npx tsc --noEmit', { encoding: 'utf8', cwd, stdio: 'pipe' });
  log(`✅ TypeScript check passed`);
} catch (e) {
  log(`⚠️  TypeScript errors detected:`);
  log(e.stdout?.toString() || e.stderr?.toString() || e.message);
}

// Test 3: NPM dependencies
try {
  log(`\n📚 Checking npm dependencies...`);
  const result = execSync('npm ls --depth=0 2>&1', { encoding: 'utf8', cwd });
  const lines = result.split('\n').slice(0, 20);
  log(lines.join('\n'));
} catch (e) {
  log(`npm ls output:`);
  log(e.stdout?.toString() || e.message);
}

// Test 4: Build test
try {
  log(`\n🔨 Testing build process...`);
  log(`Running: npm run build`);
  const result = execSync('npm run build 2>&1', { encoding: 'utf8', cwd, timeout: 120000 });
  const lines = result.split('\n').slice(-30);
  log(lines.join('\n'));
  log(`✅ Build completed`);
} catch (e) {
  log(`Build output (last 50 lines):`);
  const stdout = e.stdout?.toString() || '';
  const stderr = e.stderr?.toString() || '';
  const fullOutput = stdout + '\n' + stderr;
  const lines = fullOutput.split('\n').slice(-50);
  log(lines.join('\n'));
  log(`Exit code: ${e.status}`);
}

// Write output to file
writeFileSync(join(cwd, 'DIAGNOSTICS.txt'), output.join('\n'));
log(`\n✅ Diagnostics written to DIAGNOSTICS.txt`);
log(`${'='.repeat(60)}\n`);
