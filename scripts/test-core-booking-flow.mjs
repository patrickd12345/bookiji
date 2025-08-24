#!/usr/bin/env node

import { spawn } from 'child_process'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
const projectRoot = join(__dirname, '..')

console.log('🚀 Starting Core Booking Flow Test Suite')
console.log('==========================================')

// Start the booking worker
console.log('\n1️⃣ Starting Booking Worker...')
const workerProcess = spawn('node', ['-e', `
  const { bookingWorker } = require('./src/lib/workers/bookingWorker.ts')
  bookingWorker.start()
  console.log('✅ Booking worker started')
  
  // Keep alive for testing
  setInterval(() => {
    const status = bookingWorker.getStatus()
    console.log('📊 Worker status:', status)
  }, 10000)
`], {
  cwd: projectRoot,
  stdio: 'inherit'
})

// Wait a moment for worker to start
await new Promise(resolve => setTimeout(resolve, 2000))

// Start the receipt service
console.log('\n2️⃣ Starting Receipt Service...')
const receiptProcess = spawn('node', ['-e', `
  const { receiptService } = require('./src/lib/services/receiptService.ts')
  console.log('✅ Receipt service started')
  
  // Process any confirmed bookings
  setInterval(async () => {
    try {
      await receiptService.processConfirmedBookings()
    } catch (error) {
      console.error('Receipt service error:', error)
    }
  }, 30000)
`], {
  cwd: projectRoot,
  stdio: 'inherit'
})

// Wait for receipt service to start
await new Promise(resolve => setTimeout(resolve, 1000))

// Run the E2E tests
console.log('\n3️⃣ Running E2E Tests...')
const testProcess = spawn('pnpm', ['test:e2e', '--grep', 'Core Booking Flow'], {
  cwd: projectRoot,
  stdio: 'inherit'
})

// Handle test completion
testProcess.on('close', (code) => {
  console.log(`\n📊 E2E Tests completed with exit code: ${code}`)
  
  // Stop the worker and receipt service
  console.log('\n🛑 Stopping services...')
  workerProcess.kill()
  receiptProcess.kill()
  
  if (code === 0) {
    console.log('✅ All tests passed! Core Booking Flow is working correctly.')
  } else {
    console.log('❌ Some tests failed. Check the output above for details.')
  }
  
  process.exit(code)
})

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT, shutting down...')
  workerProcess.kill()
  receiptProcess.kill()
  testProcess.kill()
  process.exit(0)
})

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM, shutting down...')
  workerProcess.kill()
  receiptProcess.kill()
  testProcess.kill()
  process.exit(0)
})

console.log('\n⏳ Test suite is running... Press Ctrl+C to stop')
console.log('📝 Check the output above for test results and worker status')
