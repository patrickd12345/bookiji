import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const output = [];

function log(msg) {
  output.push(msg);
}

try {
  log('=== GIT STATUS CHECK ===');
  log('');
  
  const status = execSync('git status --short', { encoding: 'utf8', cwd: __dirname });
  log('Git Status (short):');
  log(status || '(clean - no changes)');
  
  log('');
  log('=== GIT LOG ===');
  const log_output = execSync('git log --oneline -10', { encoding: 'utf8', cwd: __dirname });
  log(log_output);
  
  log('');
  log('=== GIT CONFIG ===');
  const config = execSync('git config -l | grep -E "(autocrlf|safecrlf)"', { 
    encoding: 'utf8', 
    cwd: __dirname,
    shell: true 
  });
  log('Git Config (autocrlf/safecrlf):');
  log(config || '(not configured)');
  
  log('');
  log('=== STAGED CHANGES ===');
  const staged = execSync('git diff --cached --stat', { encoding: 'utf8', cwd: __dirname });
  log(staged || '(nothing staged)');
  
  log('');
  log('=== UNTRACKED FILES ===');
  const untracked = execSync('git ls-files --others --exclude-standard', { encoding: 'utf8', cwd: __dirname });
  log(untracked || '(no untracked files)');
  
} catch (e) {
  log('Error: ' + e.message);
  log(e.stdout?.toString() || '');
}

const outPath = path.join(__dirname, 'GIT_CHECK.txt');
fs.writeFileSync(outPath, output.join('\n'));
console.log('✓ Wrote to GIT_CHECK.txt');
