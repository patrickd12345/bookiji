import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const msg = `Test output at ${new Date().toISOString()} from Node.js`;
console.log(msg);

const filePath = path.join(__dirname, 'quick-test-output.txt');
fs.writeFileSync(filePath, msg + '\n');
console.log(`Written to ${filePath}`);

console.log('Current directory:', __dirname);
console.log('Files in directory:', fs.readdirSync(__dirname).filter(f => f.startsWith('.')).slice(0, 5));

