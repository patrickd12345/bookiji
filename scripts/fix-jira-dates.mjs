#!/usr/bin/env node
/**
 * Fix dates for imported Jira issues
 * 
 * Usage:
 *   JIRA_URL=https://bookiiji.atlassian.net \
 *   JIRA_EMAIL=your-email@example.com \
 *   JIRA_API_TOKEN=your-api-token \
 *   JIRA_PROJECT_KEY=KAN \
 *   node scripts/fix-jira-dates.mjs
 */

const JIRA_URL = process.env.JIRA_URL?.replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'KAN';

if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');

// Date mappings from WBS
const dateMap = {
  // Past tasks (P-001 to P-018) - KAN-4 to KAN-21
  'KAN-4': '2025-08-16', 'KAN-5': '2025-08-19', 'KAN-6': '2025-08-23',
  'KAN-7': '2025-08-30', 'KAN-8': '2025-09-04', 'KAN-9': '2025-09-12',
  'KAN-10': '2025-09-19', 'KAN-11': '2025-12-30', 'KAN-12': '2026-01-02',
  'KAN-13': '2025-09-25', 'KAN-14': '2025-10-02', 'KAN-15': '2025-10-07',
  'KAN-16': '2025-10-11', 'KAN-17': '2025-09-24', 'KAN-18': '2025-10-18',
  'KAN-19': '2025-10-24', 'KAN-20': '2026-01-03', 'KAN-21': '2025-12-23',
  
  // Milestones
  'KAN-22': '2026-01-12', // M-REQ
  'KAN-23': '2026-01-19', // M-DES
  'KAN-24': '2026-03-14', // M-CODE
  'KAN-25': '2026-01-26', // M-TEST
  'KAN-26': '2026-03-21', // M-RC
  'KAN-27': '2026-03-28', // M-PROD
  
  // Future tasks (F-001 to F-043) - KAN-28 to KAN-70
  'KAN-28': '2026-01-06', 'KAN-29': '2026-01-06', 'KAN-30': '2026-01-06',
  'KAN-31': '2026-01-09', 'KAN-32': '2026-01-12', 'KAN-33': '2026-01-12',
  'KAN-34': '2026-01-14', 'KAN-35': '2026-01-14', 'KAN-36': '2026-01-22',
  'KAN-37': '2026-01-26', 'KAN-38': '2026-02-03', 'KAN-39': '2026-02-06',
  'KAN-40': '2026-02-12', 'KAN-41': '2026-02-17', 'KAN-42': '2026-01-26',
  'KAN-43': '2026-02-03', 'KAN-44': '2026-02-06', 'KAN-45': '2026-02-12',
  'KAN-46': '2026-02-17', 'KAN-47': '2026-02-21', 'KAN-48': '2026-02-26',
  'KAN-49': '2026-03-04', 'KAN-50': '2026-01-22', 'KAN-51': '2026-01-26',
  'KAN-52': '2026-02-03', 'KAN-53': '2026-02-10', 'KAN-54': '2026-02-13',
  'KAN-55': '2026-02-18', 'KAN-56': '2026-02-21', 'KAN-57': '2026-01-14',
  'KAN-58': '2026-01-20', 'KAN-59': '2026-02-20', 'KAN-60': '2026-01-23',
  'KAN-61': '2026-01-23', 'KAN-62': '2026-01-25', 'KAN-63': '2026-01-27',
  'KAN-64': '2026-02-03', 'KAN-65': '2026-03-10', 'KAN-66': '2026-03-13',
  'KAN-67': '2026-03-25', 'KAN-68': '2026-03-27', 'KAN-69': '2026-03-28',
  'KAN-70': '2026-04-01',
};

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

async function updateIssueDate(issueKey, dueDate) {
  try {
    await jiraRequest('PUT', `/issue/${issueKey}`, {
      fields: {
        duedate: dueDate,
      },
    });
    console.log(`✅ Updated ${issueKey}: ${dueDate}`);
  } catch (error) {
    console.error(`❌ Failed to update ${issueKey}: ${error.message}`);
  }
}

async function fixDates() {
  console.log('🔧 Fixing Jira issue dates...\n');
  
  // Test connection
  try {
    const myself = await jiraRequest('GET', '/myself');
    console.log(`✅ Connected as: ${myself.displayName}\n`);
  } catch (error) {
    console.error('❌ Failed to connect to Jira');
    process.exit(1);
  }

  // Update all dates
  let updated = 0;
  for (const [issueKey, dueDate] of Object.entries(dateMap)) {
    await updateIssueDate(issueKey, dueDate);
    updated++;
  }

  console.log(`\n✅ Updated ${updated} issues`);
  console.log(`   View in Jira: ${JIRA_URL}/browse/${JIRA_PROJECT_KEY}`);
}

fixDates().catch(error => {
  console.error('❌ Fix failed:', error);
  process.exit(1);
});
