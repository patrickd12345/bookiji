#!/usr/bin/env node
import { execSync } from 'child_process';

try {
  const out = execSync('pnpm eslint . -f json', { encoding: 'utf8' });
  const results = JSON.parse(out);
  const counts = {};

  for (const file of results) {
    for (const msg of file.messages) {
      counts[msg.ruleId] = (counts[msg.ruleId] || 0) + 1;
    }
  }

  console.log('⚠️ Warning debt breakdown:');
  Object.entries(counts)
    .sort((a,b) => b[1]-a[1])
    .forEach(([rule, count]) => console.log(`${rule}: ${count}`));
} catch (e) {
  console.error('Failed to run warning debt analysis:', e.message);
  process.exit(1);
}
