#!/usr/bin/env node
import { execSync } from 'child_process';

const url = process.env.DATABASE_URL;
const file = process.argv[2];
if (!url || !file) {
  console.error('Usage: node scripts/restore-database.js <backup-file>');
  process.exit(1);
}

try {
  execSync(`psql ${url} < ${file}`, { stdio: 'inherit', shell: true });
  console.log('Restore complete');
} catch (err) {
  console.error('Restore failed');
  process.exit(1);
}
