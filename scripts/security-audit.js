#!/usr/bin/env node
import { spawnSync } from 'child_process';

console.log('Running security audit...');
const result = spawnSync('rg', ['-n', '(SECRET_KEY|API_KEY)=[A-Za-z0-9]'], {
  encoding: 'utf-8',
});
if (result.stdout) {
  console.error('Potential secrets found:\n' + result.stdout);
  process.exit(1);
}
console.log('No hardcoded secrets detected.');
