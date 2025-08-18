const { execSync } = require('node:child_process');
const fs = require('node:fs');

function run(cmd) {
  try { return execSync(cmd, { stdio: ['ignore','pipe','pipe'] }).toString(); }
  catch (e) { return e.stdout?.toString() || e.message; }
}

const tsc = run('pnpm exec tsc -p tsconfig.json --noEmit');
const eslint = run('pnpm exec eslint . -f json || true');

const tsErrors = (tsc.match(/error TS\d+:/g) || []).length;
const tsWarnings = 0; // tsc doesn't warn meaningfully

let esJson = [];
try { esJson = JSON.parse(eslint); } catch {}
const esCounts = esJson.reduce((acc, f) => {
  for (const m of f.messages || []) {
    if (m.severity === 2) acc.errors++;
    else if (m.severity === 1) acc.warnings++;
  }
  return acc;
}, { errors: 0, warnings: 0 });

const payload = {
  timestamp: new Date().toISOString(),
  typescript: { errors: tsErrors, warnings: tsWarnings },
  eslint: { errors: esCounts.errors, warnings: esCounts.warnings },
  totalWarnings: tsWarnings + esCounts.warnings,
  totalErrors: tsErrors + esCounts.errors,
};

fs.writeFileSync('warning-debt.json', JSON.stringify(payload, null, 2));
console.log('warning-debt.json written:', payload);
