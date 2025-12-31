#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const reportPath = path.join(process.cwd(), 'artifacts', 'doc-integrity-report.json');

if (!fs.existsSync(reportPath)) {
  console.log('No documentation integrity report found. The docs:i integrity tool likely failed earlier.');
  process.exit(0);
}

try {
  const report = JSON.parse(fs.readFileSync(reportPath, 'utf8'));
  const totals = {
    undocumented: (report.undocumented_code || []).length,
    missing: (report.unimplemented_docs || []).length,
    untested: (report.untested_guarantees || []).length,
    obsolete: (report.obsolete_references || []).length,
    ambiguous: (report.ambiguous_claims || []).length,
  };

  const totalCount = Object.values(totals).reduce((sum, value) => sum + value, 0);
  const status = totalCount === 0 ? 'clean' : 'violations';

  console.log(`Documentation Integrity status: ${status}`);
  console.log(
    `Counts -> undocumented:${totals.undocumented}, missing:${totals.missing}, untested:${totals.untested}, obsolete:${totals.obsolete}, ambiguous:${totals.ambiguous}`
  );

  const preview = [
    ...((report.unimplemented_docs || []).slice(0, 3).map((v) => `unimplemented: ${v}`)),
    ...((report.undocumented_code || []).slice(0, 3).map((v) => `undocumented: ${v}`)),
    ...((report.untested_guarantees || []).slice(0, 3).map((v) => `untested: ${v}`)),
    ...((report.obsolete_references || []).slice(0, 2).map((v) => `obsolete: ${v}`)),
    ...((report.ambiguous_claims || []).slice(0, 2).map((v) => `ambiguous: ${v}`)),
  ].slice(0, 8);

  if (preview.length) {
    console.log('Top findings:');
    preview.forEach((item) => console.log(`- ${item}`));
  }
} catch (error) {
  console.error('Failed to summarize documentation integrity report:', error);
  process.exit(1);
}
