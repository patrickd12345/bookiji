#!/usr/bin/env node

/**
 * PR Guard Script
 * 
 * Enforces the pilot plan.json requirements:
 * - Fails if critical tasks are missing
 * - Prevents dependency cycles
 * - Validates acceptance gates
 * - Checks SLO compliance
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Colors for console output
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
}

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`)
}

function logError(message) {
  log(`❌ ${message}`, 'red')
}

function logSuccess(message) {
  log(`✅ ${message}`, 'green')
}

function logWarning(message) {
  log(`⚠️  ${message}`, 'yellow')
}

function logInfo(message) {
  log(`ℹ️  ${message}`, 'blue')
}

// Load and parse plan.json
function loadPlan() {
  try {
    const planPath = path.join(__dirname, '..', 'docs', 'finish-line', 'plan_pilot_two_weeks.json')
    const planContent = fs.readFileSync(planPath, 'utf8')
    return JSON.parse(planContent)
  } catch (error) {
    logError(`Failed to load plan.json: ${error.message}`)
    process.exit(1)
  }
}

// Check if all critical tasks are present
function checkCriticalTasks(plan) {
  logInfo('Checking critical tasks...')
  
  const missingTasks = []
  for (const taskId of plan.fail_if_missing_tasks) {
    if (!plan.tasks[taskId]) {
      missingTasks.push(taskId)
    }
  }
  
  if (missingTasks.length > 0) {
    logError(`Missing critical tasks: ${missingTasks.join(', ')}`)
    return false
  }
  
  logSuccess('All critical tasks present')
  return true
}

// Check for dependency cycles using DFS
function checkDependencyCycles(plan) {
  logInfo('Checking for dependency cycles...')
  
  const visited = new Set()
  const recursionStack = new Set()
  
  function hasCycle(taskId) {
    if (recursionStack.has(taskId)) {
      return true
    }
    
    if (visited.has(taskId)) {
      return false
    }
    
    visited.add(taskId)
    recursionStack.add(taskId)
    
    const task = plan.tasks[taskId]
    if (task && task.depends_on) {
      for (const depId of task.depends_on) {
        if (hasCycle(depId)) {
          return true
        }
      }
    }
    
    recursionStack.delete(taskId)
    return false
  }
  
  for (const taskId of Object.keys(plan.tasks)) {
    if (hasCycle(taskId)) {
      logError(`Dependency cycle detected involving task: ${taskId}`)
      return false
    }
  }
  
  logSuccess('No dependency cycles detected')
  return true
}

// Validate acceptance gates
function validateAcceptanceGates(plan) {
  logInfo('Validating acceptance gates...')
  
  for (const [gateId, gate] of Object.entries(plan.acceptance_gates)) {
    logInfo(`Checking gate: ${gate.name}`)
    
    if (!gate.criteria || gate.criteria.length === 0) {
      logWarning(`Gate ${gateId} has no criteria defined`)
      continue
    }
    
    logSuccess(`Gate ${gateId}: ${gate.criteria.length} criteria defined`)
  }
  
  return true
}

// Check SLO compliance (basic validation)
function checkSLOCompliance(plan) {
  logInfo('Checking SLO compliance requirements...')
  
  // Look for SLO-related tasks
  const sloTasks = Object.values(plan.tasks).filter(task => 
    task.name.toLowerCase().includes('slo') || 
    task.description.toLowerCase().includes('slo')
  )
  
  if (sloTasks.length === 0) {
    logWarning('No SLO-related tasks found in plan')
  } else {
    logSuccess(`Found ${sloTasks.length} SLO-related tasks`)
  }
  
  return true
}

// Generate plan summary
function generatePlanSummary(plan) {
  logInfo('Generating plan summary...')
  
  const totalTasks = Object.keys(plan.tasks).length
  const totalDays = Object.values(plan.tasks).reduce((sum, task) => sum + task.estimate_days, 0)
  
  log(`📋 Plan Summary:`, 'bold')
  log(`   Total Tasks: ${totalTasks}`)
  log(`   Total Effort: ${totalDays} days`)
  log(`   Target Date: ${plan.target_date}`)
  log(`   Baseline: ${plan.baseline_tag}`)
  
  // Group tasks by lane
  const tasksByLane = {}
  for (const task of Object.values(plan.tasks)) {
    if (!tasksByLane[task.lane]) {
      tasksByLane[task.lane] = []
    }
    tasksByLane[task.lane].push(task)
  }
  
  log(`\n📊 Tasks by Lane:`, 'bold')
  for (const [laneId, tasks] of Object.entries(tasksByLane)) {
    const lane = plan.lanes[laneId]
    const totalEffort = tasks.reduce((sum, task) => sum + task.estimate_days, 0)
    log(`   ${lane.name}: ${tasks.length} tasks, ${totalEffort} days`)
  }
  
  // Show milestones
  log(`\n🎯 Milestones:`, 'bold')
  for (const [milestoneId, milestone] of Object.entries(plan.milestones)) {
    log(`   ${milestone.name}: ${milestone.date} (${milestone.tasks.length} tasks)`)
  }
}

// Main validation function
function validatePlan() {
  log('🚀 PR Guard: Validating Pilot Plan', 'bold')
  log('=====================================\n')
  
  const plan = loadPlan()
  
  let allChecksPassed = true
  
  // Run all validation checks
  if (!checkCriticalTasks(plan)) allChecksPassed = false
  if (!checkDependencyCycles(plan)) allChecksPassed = false
  if (!validateAcceptanceGates(plan)) allChecksPassed = false
  if (!checkSLOCompliance(plan)) allChecksPassed = false
  
  // Generate summary
  generatePlanSummary(plan)
  
  // Final result
  log('\n=====================================')
  if (allChecksPassed) {
    log('🎉 All validation checks passed!', 'green')
    log('✅ PR can proceed to review', 'green')
    process.exit(0)
  } else {
    log('❌ Validation checks failed!', 'red')
    log('❌ PR cannot proceed until issues are resolved', 'red')
    process.exit(1)
  }
}

// Run validation if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  validatePlan()
}

export { validatePlan, loadPlan }
