import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logFile = path.join(__dirname, 'dev-server-test.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });

function log(msg) {
  const timestamp = new Date().toISOString();
  const fullMsg = `[${timestamp}] ${msg}\n`;
  logStream.write(fullMsg);
  console.log(fullMsg);
}

log('=== Starting Dev Server Test ===');
log(`Working directory: ${process.cwd()}`);
log(`Node version: ${process.version}`);

// Try to start the dev server
const devProcess = spawn('npm', ['run', 'dev'], {
  cwd: __dirname,
  stdio: ['ignore', 'pipe', 'pipe'],
  shell: true
});

log('Dev process spawned with PID: ' + devProcess.pid);

// Capture stdout
devProcess.stdout.on('data', (data) => {
  log(`STDOUT: ${data}`);
});

// Capture stderr
devProcess.stderr.on('data', (data) => {
  log(`STDERR: ${data}`);
});

// Handle process exit
devProcess.on('close', (code) => {
  log(`Process exited with code: ${code}`);
});

devProcess.on('error', (err) => {
  log(`Process error: ${err.message}`);
});

// Wait 10 seconds then check if process is still running
setTimeout(() => {
  log('Checking process status after 10 seconds...');
  if (devProcess.killed) {
    log('Process has been killed/exited');
  } else {
    log('Process is still running (PID: ' + devProcess.pid + ')');
  }
  
  // Kill the process
  devProcess.kill();
  log('Killing process...');
  
  setTimeout(() => {
    log('Test complete');
    logStream.end();
  }, 1000);
}, 10000);

