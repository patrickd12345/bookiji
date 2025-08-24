#!/usr/bin/env node

console.log('🚀 PR Guard Test Script')
console.log('Testing basic functionality...')

try {
  const fs = require('fs')
  const path = require('path')
  
  const planPath = path.join(__dirname, '..', 'docs', 'finish-line', 'plan_pilot_two_weeks.json')
  console.log('Plan path:', planPath)
  
  if (fs.existsSync(planPath)) {
    console.log('✅ Plan file exists')
    const planContent = fs.readFileSync(planPath, 'utf8')
    const plan = JSON.parse(planContent)
    console.log('✅ Plan loaded successfully')
    console.log('Plan ID:', plan.plan_id)
    console.log('Total tasks:', Object.keys(plan.tasks).length)
  } else {
    console.log('❌ Plan file not found')
  }
} catch (error) {
  console.error('❌ Error:', error.message)
}

console.log('Test complete')
