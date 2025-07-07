import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LINT_FILE = path.join(__dirname, '..', 'lint-results.json');

function getUnusedVars() {
  const data = JSON.parse(fs.readFileSync(LINT_FILE, 'utf8'));
  const unusedVars = [];
  for (const file of data) {
    for (const msg of file.messages) {
      if (
        msg.ruleId === '@typescript-eslint/no-unused-vars' &&
        msg.message.includes('is assigned a value but never used') ||
        msg.message.includes('is defined but never used')
      ) {
        unusedVars.push({
          filePath: file.filePath,
          line: msg.line,
          varName: msg.message.match(/'([^']+)'/)[1],
        });
      }
    }
  }
  return unusedVars;
}

function removeLine(filePath, lineNumber) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  // Remove the line, and if it's a single-line const/let/var, remove the whole line
  lines.splice(lineNumber - 1, 1);
  fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
}

function main() {
  const unusedVars = getUnusedVars();
  if (unusedVars.length === 0) {
    console.log('No unused variables found.');
    return;
  }
  console.log(`Removing ${unusedVars.length} unused variables...`);
  for (const { filePath, line, varName } of unusedVars) {
    try {
      removeLine(filePath, line);
      console.log(`Removed unused variable '${varName}' from ${filePath}:${line}`);
    } catch (e) {
      console.error(`Failed to remove '${varName}' from ${filePath}:${line}:`, e.message);
    }
  }
}

main(); 