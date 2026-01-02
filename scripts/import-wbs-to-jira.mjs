#!/usr/bin/env node
/**
 * Import Vendor Scheduling MVP WBS to Jira
 * 
 * Usage:
 *   JIRA_URL=https://your-domain.atlassian.net \
 *   JIRA_EMAIL=your-email@example.com \
 *   JIRA_API_TOKEN=your-api-token \
 *   JIRA_PROJECT_KEY=BOOK \
 *   node scripts/import-wbs-to-jira.mjs
 * 
 * To get API token:
 *   1. Go to https://id.atlassian.com/manage-profile/security/api-tokens
 *   2. Create API token
 *   3. Use email + API token for basic auth
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Configuration from environment
const JIRA_URL = process.env.JIRA_URL?.replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'BOOK';
const DRY_RUN = process.env.DRY_RUN === 'true';

// Validate configuration
if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing required environment variables:');
  console.error('   JIRA_URL - Your Jira instance URL (e.g., https://your-domain.atlassian.net)');
  console.error('   JIRA_EMAIL - Your Jira email address');
  console.error('   JIRA_API_TOKEN - Your Jira API token (create at https://id.atlassian.com/manage-profile/security/api-tokens)');
  console.error('   JIRA_PROJECT_KEY - Your Jira project key (optional, defaults to BOOK)');
  process.exit(1);
}

// Basic auth header
const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

// WBS Data - Past tasks (completed)
const pastTasks = [
  { id: 'P-001', name: 'Project repository initialization', phase: 'Discovery', status: 'Done', priority: 'Medium', due: '2025-08-16', deps: [], deliverable: 'package.json, next.config.ts, turbo.json' },
  { id: 'P-002', name: 'Next.js 15 + TypeScript scaffolding', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-08-19', deps: ['P-001'], deliverable: 'src/app/, tsconfig.json, App Router structure' },
  { id: 'P-003', name: 'Supabase project setup & local dev', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-08-23', deps: ['P-001'], deliverable: 'supabase/ directory, local Supabase running' },
  { id: 'P-004', name: 'Core database schema (profiles, services, bookings)', phase: 'Build', status: 'Done', priority: 'High', due: '2025-08-30', deps: ['P-003'], deliverable: 'supabase/migrations/20250819190000_complete_database_schema.sql' },
  { id: 'P-005', name: 'Authentication & RLS policies', phase: 'Build', status: 'Done', priority: 'High', due: '2025-09-04', deps: ['P-004'], deliverable: 'Auth routes, RLS policies in migrations' },
  { id: 'P-006', name: 'Basic booking engine (create, confirm, cancel)', phase: 'Build', status: 'Done', priority: 'High', due: '2025-09-12', deps: ['P-004'], deliverable: 'src/lib/bookingEngine.ts, src/app/api/bookings/*/route.ts' },
  { id: 'P-007', name: 'Availability engine (slot computation)', phase: 'Build', status: 'Done', priority: 'High', due: '2025-09-19', deps: ['P-004'], deliverable: 'src/lib/availabilityEngine.ts, tests/lib/availabilityEngine.spec.ts' },
  { id: 'P-008', name: 'Vendor subscription lifecycle (schema + API)', phase: 'Build', status: 'Done', priority: 'High', due: '2025-12-30', deps: ['P-004'], deliverable: 'supabase/migrations/20251224205800_vendor_subscriptions.sql, /api/vendor/subscription/*' },
  { id: 'P-009', name: 'Payment-free vendor booking flows', phase: 'Build', status: 'Done', priority: 'High', due: '2026-01-02', deps: ['P-006', 'P-008'], deliverable: 'src/app/api/vendor/bookings/create/route.ts, vendor_created flag' },
  { id: 'P-010', name: 'Google Calendar OAuth foundation', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-09-25', deps: ['P-003'], deliverable: 'src/app/api/auth/google/*, provider_google_calendar table' },
  { id: 'P-011', name: 'One-way calendar sync (free/busy read)', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-10-02', deps: ['P-010'], deliverable: 'src/app/api/calendar/sync/route.ts, src/lib/calendar-adapters/google.ts' },
  { id: 'P-012', name: 'Credits/loyalty database schema', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-10-07', deps: ['P-004'], deliverable: 'user_credits, credit_transactions tables in migrations' },
  { id: 'P-013', name: 'Basic credits service (earn/spend)', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-10-11', deps: ['P-012'], deliverable: 'src/lib/credits.ts, src/app/api/credits/*/route.ts' },
  { id: 'P-014', name: 'Unit test framework (Vitest)', phase: 'Verify', status: 'Done', priority: 'Medium', due: '2025-09-24', deps: ['P-006', 'P-007'], deliverable: 'vitest.config.ts, tests/lib/bookingEngine.spec.ts, tests/lib/availabilityEngine.spec.ts' },
  { id: 'P-015', name: 'API E2E test suite (Playwright)', phase: 'Verify', status: 'Done', priority: 'Medium', due: '2025-10-18', deps: ['P-006'], deliverable: 'tests/api/bookings.*.spec.ts, tests/api/availability.spec.ts' },
  { id: 'P-016', name: 'UI E2E test suite (customer/vendor flows)', phase: 'Verify', status: 'Done', priority: 'Medium', due: '2025-10-24', deps: ['P-006'], deliverable: 'tests/e2e/bookings/customer-flow.spec.ts, tests/e2e/bookings/vendor-flow.spec.ts' },
  { id: 'P-017', name: 'Atomic booking claim (race condition fix)', phase: 'Build', status: 'Done', priority: 'High', due: '2026-01-03', deps: ['P-006'], deliverable: 'supabase/migrations/20260101135426_enforce_booking_atomicity.sql, claim_slot_and_create_booking() RPC' },
  { id: 'P-018', name: 'Vendor scheduling UI (basic)', phase: 'Build', status: 'Done', priority: 'Medium', due: '2025-12-23', deps: ['P-007', 'P-008'], deliverable: 'src/app/vendor/schedule/page.tsx, ScheduleClient.tsx' },
];

// Milestones
const milestones = [
  { id: 'M-REQ', name: 'REQ Baseline Approved', due: '2026-01-12', deps: ['F-001', 'F-002', 'F-003'], priority: 'High' },
  { id: 'M-DES', name: 'Design Baseline Approved', due: '2026-01-19', deps: ['F-004', 'F-005', 'F-006'], priority: 'High' },
  { id: 'M-CODE', name: 'Code Freeze', due: '2026-03-14', deps: [], priority: 'High' },
  { id: 'M-TEST', name: 'Test Plan Approved', due: '2026-01-26', deps: ['F-007', 'F-008'], priority: 'Medium' },
  { id: 'M-RC', name: 'Release Candidate', due: '2026-03-21', deps: [], priority: 'High' },
  { id: 'M-PROD', name: 'Production Approval', due: '2026-03-28', deps: ['M-RC', 'F-040', 'F-041'], priority: 'Critical' },
];

// Future tasks
const futureTasks = [
  { id: 'F-001', name: 'Requirements: Vendor availability hardening', phase: 'Requirements', status: 'To Do', priority: 'High', due: '2026-01-06', deps: [], deliverable: '/docs/requirements/vendor-availability-hardening.md' },
  { id: 'F-002', name: 'Requirements: Calendar sync 2-way', phase: 'Requirements', status: 'To Do', priority: 'High', due: '2026-01-06', deps: [], deliverable: '/docs/requirements/calendar-sync-2way.md' },
  { id: 'F-003', name: 'Requirements: Loyalty/credits reconciliation', phase: 'Requirements', status: 'To Do', priority: 'High', due: '2026-01-06', deps: [], deliverable: '/docs/requirements/loyalty-reconciliation.md' },
  { id: 'F-004', name: 'Design: Availability conflict resolution', phase: 'Design', status: 'To Do', priority: 'High', due: '2026-01-09', deps: ['F-001'], deliverable: '/docs/design/availability-conflict-resolution.md' },
  { id: 'F-005', name: 'Design: Calendar sync architecture (ICS + 2-way)', phase: 'Design', status: 'To Do', priority: 'High', due: '2026-01-12', deps: ['F-002'], deliverable: '/docs/design/calendar-sync-architecture.md' },
  { id: 'F-006', name: 'Design: Credits reconciliation system', phase: 'Design', status: 'To Do', priority: 'High', due: '2026-01-12', deps: ['F-003'], deliverable: '/docs/design/credits-reconciliation.md' },
  { id: 'F-007', name: 'Test plan: Vendor availability hardening', phase: 'Verify', status: 'To Do', priority: 'Medium', due: '2026-01-14', deps: ['F-001'], deliverable: '/tests/plan/vendor-availability-hardening.md' },
  { id: 'F-008', name: 'Test plan: Calendar sync + loyalty', phase: 'Verify', status: 'To Do', priority: 'Medium', due: '2026-01-14', deps: ['F-002', 'F-003'], deliverable: '/tests/plan/calendar-loyalty-integration.md' },
  { id: 'F-009', name: 'Vendor availability: Slot conflict detection', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-01-22', deps: ['M-DES', 'F-004'], deliverable: 'src/lib/availabilityConflictDetector.ts, unit tests' },
  { id: 'F-010', name: 'Vendor availability: Atomic slot updates', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-01-26', deps: ['F-009'], deliverable: 'Migration: enforce_atomic_slot_updates.sql, RPC function' },
  { id: 'F-011', name: 'Vendor availability: Recurring slot management', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-02-03', deps: ['F-010'], deliverable: 'src/lib/recurringSlotManager.ts, recurrence_rule support' },
  { id: 'F-012', name: 'Vendor availability: Block time API', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-06', deps: ['F-010'], deliverable: '/api/vendor/availability/block, migration for blocked_slots' },
  { id: 'F-013', name: 'Vendor availability: Conflict resolution UI', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-12', deps: ['F-009'], deliverable: 'src/components/vendor/ConflictResolutionDialog.tsx' },
  { id: 'F-014', name: 'Vendor availability: API hardening tests', phase: 'Verify', status: 'To Do', priority: 'High', due: '2026-02-17', deps: ['F-009', 'F-010', 'F-011'], deliverable: 'tests/api/vendor/availability-hardening.spec.ts' },
  { id: 'F-015', name: 'Calendar sync: 2-way free/busy sync', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-01-26', deps: ['M-DES', 'F-005'], deliverable: 'src/lib/calendarSync/twoWaySync.ts, cron job setup' },
  { id: 'F-016', name: 'Calendar sync: Write bookings to Google Calendar', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-02-03', deps: ['F-015'], deliverable: 'src/lib/calendarSync/writeToCalendar.ts, event creation API' },
  { id: 'F-017', name: 'Calendar sync: ICS export endpoint', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-06', deps: ['F-015'], deliverable: '/api/vendor/calendar/export.ics, src/lib/icsGenerator.ts' },
  { id: 'F-018', name: 'Calendar sync: ICS import (vendor upload)', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-12', deps: ['F-017'], deliverable: '/api/vendor/calendar/import, src/lib/icsParser.ts' },
  { id: 'F-019', name: 'Calendar sync: Invite generation (email)', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-17', deps: ['F-016'], deliverable: 'src/lib/calendarInvites/generateInvite.ts, email template' },
  { id: 'F-020', name: 'Calendar sync: Update/cancel event sync', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-02-21', deps: ['F-016'], deliverable: 'src/lib/calendarSync/updateEvent.ts, cancelEvent.ts' },
  { id: 'F-021', name: 'Calendar sync: Sync status dashboard', phase: 'Build', status: 'To Do', priority: 'Low', due: '2026-02-26', deps: ['F-015', 'F-016'], deliverable: 'src/app/vendor/calendar/sync-status/page.tsx' },
  { id: 'F-022', name: 'Calendar sync: Integration tests', phase: 'Verify', status: 'To Do', priority: 'High', due: '2026-03-04', deps: ['F-015', 'F-016', 'F-020'], deliverable: 'tests/integration/calendar-sync.spec.ts' },
  { id: 'F-023', name: 'Loyalty: Earn credits on booking completion', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-01-22', deps: ['M-DES', 'F-006'], deliverable: 'src/lib/loyalty/earnCredits.ts, webhook handler update' },
  { id: 'F-024', name: 'Loyalty: Redeem credits at checkout', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-01-26', deps: ['F-023'], deliverable: 'src/components/checkout/CreditsRedemption.tsx (enhance), API update' },
  { id: 'F-025', name: 'Loyalty: Tier progression logic', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-03', deps: ['F-023'], deliverable: 'src/lib/loyalty/tierCalculator.ts, migration for tier tracking' },
  { id: 'F-026', name: 'Loyalty: Credits reconciliation job', phase: 'Build', status: 'To Do', priority: 'High', due: '2026-02-10', deps: ['F-023', 'F-024'], deliverable: 'src/lib/loyalty/reconciliation.ts, cron job, reconciliation_runs table' },
  { id: 'F-027', name: 'Loyalty: Reconciliation dashboard', phase: 'Build', status: 'To Do', priority: 'Low', due: '2026-02-13', deps: ['F-026'], deliverable: 'src/app/admin/loyalty/reconciliation/page.tsx' },
  { id: 'F-028', name: 'Loyalty: Unit tests (earn/redeem/tier)', phase: 'Verify', status: 'To Do', priority: 'High', due: '2026-02-18', deps: ['F-023', 'F-024', 'F-025'], deliverable: 'tests/lib/loyalty/*.spec.ts' },
  { id: 'F-029', name: 'Loyalty: Reconciliation tests', phase: 'Verify', status: 'To Do', priority: 'High', due: '2026-02-21', deps: ['F-026'], deliverable: 'tests/integration/loyalty-reconciliation.spec.ts' },
  { id: 'F-030', name: 'GTM: Pricing page updates', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-01-14', deps: ['M-REQ'], deliverable: 'src/app/vendor/pricing/page.tsx (update copy, features)' },
  { id: 'F-031', name: 'GTM: Vendor onboarding flow enhancement', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-01-20', deps: ['F-030'], deliverable: 'src/app/vendor/onboarding/page.tsx, step-by-step wizard' },
  { id: 'F-032', name: 'GTM: Email templates (booking confirmations)', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-02-20', deps: ['F-019'], deliverable: 'src/lib/email/templates/booking-confirmation.tsx, Resend integration' },
  { id: 'F-033', name: 'GTM: Email templates (onboarding sequence)', phase: 'Build', status: 'To Do', priority: 'Low', due: '2026-01-23', deps: ['F-031'], deliverable: 'src/lib/email/templates/onboarding-sequence.tsx' },
  { id: 'F-034', name: 'GTM: Monitoring dashboard (vendor metrics)', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-01-23', deps: ['M-DES'], deliverable: 'src/app/vendor/dashboard/analytics/page.tsx, metrics API' },
  { id: 'F-035', name: 'GTM: Error alerting (Sentry integration)', phase: 'Build', status: 'To Do', priority: 'Medium', due: '2026-01-25', deps: ['F-034'], deliverable: 'Sentry config, alert rules, src/lib/monitoring/sentry.ts' },
  { id: 'F-036', name: 'GTM: Performance monitoring (Core Web Vitals)', phase: 'Build', status: 'To Do', priority: 'Low', due: '2026-01-27', deps: ['F-034'], deliverable: 'Vercel Analytics integration, dashboard' },
  { id: 'F-037', name: 'GTM: Documentation (vendor guide)', phase: 'Build', status: 'To Do', priority: 'Low', due: '2026-02-03', deps: ['F-031'], deliverable: '/docs/vendor-guide/getting-started.md, /docs/vendor-guide/scheduling.md' },
  { id: 'F-038', name: 'Integration: End-to-end booking flow test', phase: 'Verify', status: 'To Do', priority: 'High', due: '2026-03-10', deps: ['F-014', 'F-022', 'F-028'], deliverable: 'tests/e2e/integration/booking-flow-complete.spec.ts' },
  { id: 'F-039', name: 'Integration: Load testing (vendor scheduling)', phase: 'Verify', status: 'To Do', priority: 'High', due: '2026-03-13', deps: ['F-038'], deliverable: 'loadtests/vendor-scheduling-load.js, report' },
  { id: 'F-040', name: 'Deploy: Staging deployment', phase: 'Deploy', status: 'To Do', priority: 'High', due: '2026-03-25', deps: ['M-RC'], deliverable: 'Vercel staging environment, smoke tests pass' },
  { id: 'F-041', name: 'Deploy: Production deployment', phase: 'Deploy', status: 'To Do', priority: 'Critical', due: '2026-03-27', deps: ['F-040'], deliverable: 'Production Vercel deploy, monitoring active' },
  { id: 'F-042', name: 'Closeout: Project retrospective', phase: 'Closeout', status: 'To Do', priority: 'Low', due: '2026-03-28', deps: ['M-PROD'], deliverable: '/docs/retrospectives/vendor-scheduling-mvp-retro.md' },
  { id: 'F-043', name: 'Closeout: Handoff documentation', phase: 'Closeout', status: 'To Do', priority: 'Low', due: '2026-04-01', deps: ['F-042'], deliverable: '/docs/handoff/vendor-scheduling-mvp.md' },
];

// Map priority to Jira priority ID (will be fetched dynamically)
const priorityMap = {
  'Critical': 'Highest',
  'High': 'High',
  'Medium': 'Medium',
  'Low': 'Low',
};

// Map status to Jira status
const statusMap = {
  'Done': 'Done',
  'To Do': 'To Do',
  'In Progress': 'In Progress',
};

// Map issue type
const issueTypeMap = {
  'Task': 'Task',
  'Story': 'Story',
  'Milestone': 'Milestone',
};

// Store created issue keys for linking dependencies
const issueKeyMap = new Map();

/**
 * Make API request to Jira
 */
async function jiraRequest(method, endpoint, body = null) {
  const url = `${JIRA_URL}/rest/api/3${endpoint}`;
  const options = {
    method,
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const text = await response.text();
    
    if (!response.ok) {
      throw new Error(`Jira API error (${response.status}): ${text}`);
    }

    return text ? JSON.parse(text) : null;
  } catch (error) {
    console.error(`❌ Request failed: ${method} ${endpoint}`);
    console.error(`   Error: ${error.message}`);
    throw error;
  }
}

/**
 * Get priority ID from name
 */
async function getPriorityId(priorityName) {
  const priorities = await jiraRequest('GET', '/priority');
  const priority = priorities.find(p => p.name === priorityMap[priorityName] || p.name === priorityName);
  return priority?.id || null;
}

/**
 * Get issue type ID from name
 */
async function getIssueTypeId(projectKey, issueTypeName) {
  const project = await jiraRequest('GET', `/project/${projectKey}`);
  const issueType = project.issueTypes.find(it => 
    it.name === issueTypeMap[issueTypeName] || it.name === issueTypeName
  );
  return issueType?.id || project.issueTypes[0]?.id;
}

/**
 * Create issue in Jira
 */
async function createIssue(task, isMilestone = false) {
  const issueType = isMilestone ? 'Milestone' : (task.phase === 'Requirements' || task.phase === 'Design' ? 'Story' : 'Task');
  const issueTypeId = await getIssueTypeId(JIRA_PROJECT_KEY, issueType);
  const priorityId = await getPriorityId(task.priority);

  const description = [
    `*Phase:* ${task.phase || 'Milestone'}`,
    `*WBS ID:* ${task.id}`,
    '',
    task.deps?.length > 0 ? `*Dependencies:* ${task.deps.join(', ')}` : '',
    task.deliverable ? `*Deliverable:* ${task.deliverable}` : '',
    '',
    isMilestone ? `*Milestone Type:* Gate` : '',
  ].filter(Boolean).join('\n');

  const issueData = {
    fields: {
      project: { key: JIRA_PROJECT_KEY },
      summary: `[${task.id}] ${task.name}`,
      description: {
        type: 'doc',
        version: 1,
        content: [
          {
            type: 'paragraph',
            content: description.split('\n').map(line => ({
              type: 'text',
              text: line || ' ',
            })),
          },
        ],
      },
      issuetype: { id: issueTypeId },
      priority: priorityId ? { id: priorityId } : undefined,
      duedate: task.due || undefined,
      labels: [
        task.phase?.toLowerCase().replace(/\s+/g, '-'),
        task.status === 'Done' ? 'past' : 'future',
        'vendor-scheduling-mvp',
      ].filter(Boolean),
    },
  };

  // Remove undefined fields
  if (!issueData.fields.priority) delete issueData.fields.priority;
  if (!issueData.fields.duedate) delete issueData.fields.duedate;

  if (DRY_RUN) {
    console.log(`[DRY RUN] Would create: ${task.id} - ${task.name}`);
    return { key: `${JIRA_PROJECT_KEY}-DRY-${task.id}` };
  }

  try {
    const issue = await jiraRequest('POST', '/issue', issueData);
    console.log(`✅ Created: ${issue.key} - ${task.name}`);
    return issue;
  } catch (error) {
    console.error(`❌ Failed to create ${task.id}: ${error.message}`);
    throw error;
  }
}

/**
 * Link issues (blocker relationship)
 */
async function linkIssues(fromKey, toKey, linkType = 'blocks') {
  if (DRY_RUN) {
    console.log(`[DRY RUN] Would link: ${fromKey} ${linkType} ${toKey}`);
    return;
  }

  try {
    await jiraRequest('POST', '/issueLink', {
      type: { name: linkType === 'blocks' ? 'Blocks' : 'Depends on' },
      inwardIssue: { key: toKey },
      outwardIssue: { key: fromKey },
    });
    console.log(`   🔗 Linked: ${fromKey} → ${toKey}`);
  } catch (error) {
    console.error(`   ⚠️  Failed to link ${fromKey} → ${toKey}: ${error.message}`);
  }
}

/**
 * Transition issue to status
 */
async function transitionIssue(issueKey, status) {
  if (DRY_RUN || status === 'To Do') return;

  try {
    // Get available transitions
    const transitions = await jiraRequest('GET', `/issue/${issueKey}/transitions`);
    const transition = transitions.transitions.find(t => 
      t.name.toLowerCase() === status.toLowerCase() || 
      t.to.name.toLowerCase() === status.toLowerCase()
    );

    if (transition) {
      await jiraRequest('POST', `/issue/${issueKey}/transitions`, {
        transition: { id: transition.id },
      });
      console.log(`   📍 Transitioned ${issueKey} to ${status}`);
    }
  } catch (error) {
    console.error(`   ⚠️  Failed to transition ${issueKey}: ${error.message}`);
  }
}

/**
 * Main import function
 */
async function importWBS() {
  console.log('🚀 Starting Jira WBS import...\n');
  console.log(`   Project: ${JIRA_PROJECT_KEY}`);
  console.log(`   URL: ${JIRA_URL}`);
  console.log(`   Mode: ${DRY_RUN ? 'DRY RUN' : 'LIVE'}\n`);

  // Test connection
  try {
    const myself = await jiraRequest('GET', '/myself');
    console.log(`✅ Connected as: ${myself.displayName} (${myself.emailAddress})\n`);
  } catch (error) {
    console.error('❌ Failed to connect to Jira. Check your credentials.');
    process.exit(1);
  }

  // Step 1: Create past tasks (Done)
  console.log('📦 Creating past tasks (18 tasks)...');
  for (const task of pastTasks) {
    const issue = await createIssue(task);
    issueKeyMap.set(task.id, issue.key);
    await transitionIssue(issue.key, 'Done');
  }
  console.log('');

  // Step 2: Create milestones
  console.log('🎯 Creating milestones (6 milestones)...');
  for (const milestone of milestones) {
    const issue = await createIssue(milestone, true);
    issueKeyMap.set(milestone.id, issue.key);
  }
  console.log('');

  // Step 3: Create future tasks
  console.log('📋 Creating future tasks (43 tasks)...');
  for (const task of futureTasks) {
    const issue = await createIssue(task);
    issueKeyMap.set(task.id, issue.key);
  }
  console.log('');

  // Step 4: Link dependencies
  console.log('🔗 Linking dependencies...');
  const allTasks = [...pastTasks, ...futureTasks, ...milestones];
  
  for (const task of allTasks) {
    if (task.deps && task.deps.length > 0) {
      const fromKey = issueKeyMap.get(task.id);
      if (!fromKey) continue;

      for (const depId of task.deps) {
        const toKey = issueKeyMap.get(depId);
        if (toKey) {
          await linkIssues(toKey, fromKey, 'blocks');
        } else {
          console.log(`   ⚠️  Dependency ${depId} not found for ${task.id}`);
        }
      }
    }
  }
  console.log('');

  console.log('✅ Import complete!');
  console.log(`   Total issues created: ${issueKeyMap.size}`);
  console.log(`   View in Jira: ${JIRA_URL}/browse/${JIRA_PROJECT_KEY}`);
}

// Run import
importWBS().catch(error => {
  console.error('❌ Import failed:', error);
  process.exit(1);
});
