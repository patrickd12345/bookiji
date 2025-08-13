#!/usr/bin/env node
import { execSync } from 'child_process';

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

const file = `backup-${new Date().toISOString().split('T')[0]}.sql`;
try {
  execSync(`pg_dump ${url} > ${file}`, { stdio: 'inherit', shell: true });
  console.log(`Backup written to ${file}`);
} catch (err) {
  console.error('Backup failed');
  process.exit(1);
}
