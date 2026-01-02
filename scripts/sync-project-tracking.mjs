#!/usr/bin/env node
/**
 * Automated Project Tracking Sync Script
 * 
 * This script helps maintain consistency between:
 * - Cursor's todo system (via todo_write tool)
 * - PROJECT_TRACKING.md
 * - PROJECT_STATUS.md
 * - README.md roadmap sections
 * 
 * Usage: node scripts/sync-project-tracking.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = process.cwd();

// Task categories mapping
const TASK_CATEGORIES = {
  'env-setup-migration': {
    section: 'Environment Setup & Migration',
    priority: 'URGENT',
    file: 'PROJECT_TRACKING.md'
  },
  'apply-db-migrations': {
    section: 'Environment Setup & Migration',
    priority: 'URGENT',
    file: 'PROJECT_TRACKING.md'
  },
  'staging-environment': {
    section: 'Staging Environment Testing',
    priority: 'CRITICAL',
    file: 'PROJECT_TRACKING.md'
  },
  'test-punchlist-features': {
    section: 'Staging Environment Testing',
    priority: 'CRITICAL',
    file: 'PROJECT_TRACKING.md'
  },
  'performance-validation': {
    section: 'Performance Validation',
    priority: 'HIGH',
    file: 'PROJECT_TRACKING.md'
  },
  'production-deployment': {
    section: 'Production Deployment',
    priority: 'HIGH',
    file: 'PROJECT_TRACKING.md'
  },
  'monitoring-setup': {
    section: 'Monitoring & Observability',
    priority: 'HIGH',
    file: 'PROJECT_TRACKING.md'
  },
  'beta-deployment': {
    section: 'Beta Launch Goals',
    priority: 'MEDIUM',
    file: 'docs/development/ROADMAP.md'
  },
  'provider-onboarding': {
    section: 'Provider Experience',
    priority: 'MEDIUM',
    file: 'docs/development/ROADMAP.md'
  },
  'scale-infrastructure': {
    section: 'Scale Infrastructure',
    priority: 'MEDIUM',
    file: 'docs/development/ROADMAP.md'
  },
  'p4-differentiators': {
    section: 'P4 - Differentiators',
    priority: 'LOW',
    file: 'README.md'
  },
  'foundational-hardening': {
    section: 'Foundational Hardening',
    priority: 'MEDIUM',
    file: 'README.md'
  }
};

/**
 * Generate a status report from todos
 * This would be called by the AI assistant after todo updates
 */
export function generateStatusReport(todos) {
  const report = {
    timestamp: new Date().toISOString(),
    summary: {
      total: todos.length,
      completed: todos.filter(t => t.status === 'completed').length,
      in_progress: todos.filter(t => t.status === 'in_progress').length,
      pending: todos.filter(t => t.status === 'pending').length,
      cancelled: todos.filter(t => t.status === 'cancelled').length
    },
    byPriority: {
      URGENT: [],
      CRITICAL: [],
      HIGH: [],
      MEDIUM: [],
      LOW: []
    },
    byCategory: {}
  };

  todos.forEach(todo => {
    const category = TASK_CATEGORIES[todo.id];
    if (category) {
      if (!report.byCategory[category.section]) {
        report.byCategory[category.section] = [];
      }
      report.byCategory[category.section].push({
        id: todo.id,
        content: todo.content,
        status: todo.status
      });

      if (category.priority) {
        report.byPriority[category.priority].push({
          id: todo.id,
          content: todo.content,
          status: todo.status
        });
      }
    }
  });

  return report;
}

/**
 * Generate markdown status update
 */
export function generateMarkdownUpdate(report) {
  const lines = [
    '# Project Tracking Status Update',
    '',
    `**Generated:** ${new Date(report.timestamp).toLocaleString()}`,
    '',
    '## Summary',
    '',
    `- **Total Tasks:** ${report.summary.total}`,
    `- **Completed:** ${report.summary.completed} ✅`,
    `- **In Progress:** ${report.summary.in_progress} 🔄`,
    `- **Pending:** ${report.summary.pending} ⏳`,
    `- **Cancelled:** ${report.summary.cancelled} ❌`,
    '',
    '## Tasks by Priority',
    ''
  ];

  // URGENT tasks
  if (report.byPriority.URGENT.length > 0) {
    lines.push('### 🔴 URGENT');
    report.byPriority.URGENT.forEach(task => {
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🔄' : '⏳';
      lines.push(`- ${statusIcon} ${task.content}`);
    });
    lines.push('');
  }

  // CRITICAL tasks
  if (report.byPriority.CRITICAL.length > 0) {
    lines.push('### 🟠 CRITICAL');
    report.byPriority.CRITICAL.forEach(task => {
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🔄' : '⏳';
      lines.push(`- ${statusIcon} ${task.content}`);
    });
    lines.push('');
  }

  // HIGH priority tasks
  if (report.byPriority.HIGH.length > 0) {
    lines.push('### 🟡 HIGH');
    report.byPriority.HIGH.forEach(task => {
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🔄' : '⏳';
      lines.push(`- ${statusIcon} ${task.content}`);
    });
    lines.push('');
  }

  // MEDIUM priority tasks
  if (report.byPriority.MEDIUM.length > 0) {
    lines.push('### 🔵 MEDIUM');
    report.byPriority.MEDIUM.forEach(task => {
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🔄' : '⏳';
      lines.push(`- ${statusIcon} ${task.content}`);
    });
    lines.push('');
  }

  // LOW priority tasks
  if (report.byPriority.LOW.length > 0) {
    lines.push('### ⚪ LOW');
    report.byPriority.LOW.forEach(task => {
      const statusIcon = task.status === 'completed' ? '✅' : 
                        task.status === 'in_progress' ? '🔄' : '⏳';
      lines.push(`- ${statusIcon} ${task.content}`);
    });
    lines.push('');
  }

  return lines.join('\n');
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Project Tracking Sync Script');
  console.log('============================');
  console.log('');
  console.log('This script is designed to be used by the AI assistant');
  console.log('to maintain consistency between todo system and markdown files.');
  console.log('');
  console.log('The AI assistant will:');
  console.log('1. Update todos using todo_write tool');
  console.log('2. Generate status reports using this script');
  console.log('3. Update PROJECT_TRACKING.md and other files as needed');
  console.log('');
  console.log('To manually generate a report, the AI should call:');
  console.log('generateStatusReport(todos) and generateMarkdownUpdate(report)');
}
