import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function removeUnusedVars() {
  try {
    // Get lint output
    const lintOutput = execSync('pnpm run lint', { encoding: 'utf8' });
    
    // Parse unused variable warnings
    const lines = lintOutput.split('\n');
    const unusedVars = [];
    
    for (const line of lines) {
      if (line.includes('is assigned a value but never used') || 
          line.includes('is defined but never used')) {
        const match = line.match(/\.\/src\/([^:]+):(\d+):/);
        if (match) {
          const [, filePath, lineNum] = match;
          const fullPath = path.join(__dirname, '..', 'src', filePath);
          unusedVars.push({ filePath: fullPath, line: parseInt(lineNum) });
        }
      }
    }
    
    console.log(`Found ${unusedVars.length} unused variables to remove`);
    
    // Remove unused variables
    for (const { filePath, line } of unusedVars) {
      try {
        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.split('\n');
        
        // Remove the line with the unused variable
        lines.splice(line - 1, 1);
        
        fs.writeFileSync(filePath, lines.join('\n'), 'utf8');
        console.log(`Removed unused variable from ${filePath}:${line}`);
      } catch (error) {
        console.error(`Failed to process ${filePath}:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

removeUnusedVars(); 