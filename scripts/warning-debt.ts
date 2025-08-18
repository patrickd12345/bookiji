import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';

function run(cmd: string) {
  try { return execSync(cmd, { stdio: 'pipe' }).toString(); }
  catch (e: any) { return e.stdout?.toString() ?? e.message; }
}

const ts = run('pnpm -s tsc --noEmit');
const eslint = run('pnpm -s eslint .');

const tsWarn = (ts.match(/warning/gi) ?? []).length; // TS doesn’t mark warnings by default; adjust if you use rules-as-warnings
const tsErr = (ts.match(/error/gi) ?? []).length;
const esWarn = (eslint.match(/warning/gi) ?? []).length;
const esErr = (eslint.match(/error/gi) ?? []).length;

const report = {
  timestamp: new Date().toISOString(),
  typescript: { errors: tsErr, warnings: tsWarn },
  eslint: { errors: esErr, warnings: esWarn },
  totalWarnings: tsWarn + esWarn,
  totalErrors: tsErr + esErr,
};

console.log('Warning debt report:', report);
writeFileSync('warning-debt.json', JSON.stringify(report, null, 2));
