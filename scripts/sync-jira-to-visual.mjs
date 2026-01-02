#!/usr/bin/env node
/**
 * Sync Jira issue status/dates to Visual Timeline
 * 
 * Reads current Jira issue status and dates, then updates the visual timeline markdown
 * 
 * Usage:
 *   JIRA_URL=https://bookiiji.atlassian.net \
 *   JIRA_EMAIL=your-email@example.com \
 *   JIRA_API_TOKEN=your-api-token \
 *   JIRA_PROJECT_KEY=KAN \
 *   node scripts/sync-jira-to-visual.mjs
 */

import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const JIRA_URL = process.env.JIRA_URL?.replace(/\/$/, '');
const JIRA_EMAIL = process.env.JIRA_EMAIL;
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN;
const JIRA_PROJECT_KEY = process.env.JIRA_PROJECT_KEY || 'KAN';

if (!JIRA_URL || !JIRA_EMAIL || !JIRA_API_TOKEN) {
  console.error('❌ Missing required environment variables');
  process.exit(1);
}

const auth = Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64');
const visualDocPath = join(__dirname, '..', 'docs', 'VENDOR_SCHEDULING_MVP_VISUAL.md');

// Map of WBS ID to Jira issue key (from import)
const wbsToJira = {
  'F-001': 'KAN-28', 'F-002': 'KAN-29', 'F-003': 'KAN-30',
  'F-004': 'KAN-31', 'F-005': 'KAN-32', 'F-006': 'KAN-33',
  'F-007': 'KAN-34', 'F-008': 'KAN-35', 'F-009': 'KAN-36',
  'F-010': 'KAN-37', 'F-011': 'KAN-38', 'F-012': 'KAN-39',
  'F-013': 'KAN-40', 'F-014': 'KAN-41', 'F-015': 'KAN-42',
  'F-016': 'KAN-43', 'F-017': 'KAN-44', 'F-018': 'KAN-45',
  'F-019': 'KAN-46', 'F-020': 'KAN-47', 'F-021': 'KAN-48',
  'F-022': 'KAN-49', 'F-023': 'KAN-50', 'F-024': 'KAN-51',
  'F-025': 'KAN-52', 'F-026': 'KAN-53', 'F-027': 'KAN-54',
  'F-028': 'KAN-55', 'F-029': 'KAN-56', 'F-030': 'KAN-57',
  'F-031': 'KAN-58', 'F-032': 'KAN-59', 'F-033': 'KAN-60',
  'F-034': 'KAN-61', 'F-035': 'KAN-62', 'F-036': 'KAN-63',
  'F-037': 'KAN-64', 'F-038': 'KAN-65', 'F-039': 'KAN-66',
  'F-040': 'KAN-67', 'F-041': 'KAN-68', 'F-042': 'KAN-69',
  'F-043': 'KAN-70',
  'M-REQ': 'KAN-22', 'M-DES': 'KAN-23', 'M-CODE': 'KAN-24',
  'M-TEST': 'KAN-25', 'M-RC': 'KAN-26', 'M-PROD': 'KAN-27',
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

  const response = await fetch(url, options);
  const text = await response.text();
  
  if (!response.ok) {
    throw new Error(`Jira API error (${response.status}): ${text}`);
  }

  return text ? JSON.parse(text) : null;
}

async function getIssueStatus(issueKey) {
  try {
    const issue = await jiraRequest('GET', `/issue/${issueKey}?fields=status,duedate,summary`);
    return {
      status: issue.fields.status.name,
      dueDate: issue.fields.duedate,
      summary: issue.fields.summary,
    };
  } catch (error) {
    console.error(`⚠️  Failed to fetch ${issueKey}: ${error.message}`);
    return null;
  }
}

function updateVisualDoc(updates) {
  let content = readFileSync(visualDocPath, 'utf8');
  
  // Update status indicators in the indented timeline
  for (const [wbsId, data] of Object.entries(updates)) {
    const pattern = new RegExp(`(\\d{4}-\\d{2}-\\d{2}.*\\|.*)${wbsId}:([^\\n]+)`, 'g');
    
    if (data.status === 'Done') {
      content = content.replace(pattern, `$1${wbsId}:$2 ✅`);
    } else if (data.status === 'In Progress') {
      content = content.replace(pattern, `$1${wbsId}:$2 🔄`);
    }
    
    // Update dates if they changed
    if (data.dueDate) {
      const datePattern = new RegExp(`(${wbsId}:[^→]+→\\s*)\\d{4}-\\d{2}-\\d{2}`, 'g');
      const newDate = data.dueDate.split('T')[0]; // Remove time if present
      content = content.replace(datePattern, `$1${newDate}`);
    }
  }
  
  // Add update timestamp
  const timestamp = new Date().toISOString().split('T')[0];
  content = content.replace(
    /(\*\*Project Timeline:\*\*[^\n]+)/,
    `$1\n**Last Synced:** ${timestamp}`
  );
  
  writeFileSync(visualDocPath, content, 'utf8');
  console.log(`✅ Updated visual timeline: ${visualDocPath}`);
}

async function sync() {
  console.log('🔄 Syncing Jira status to visual timeline...\n');
  
  const updates = {};
  let synced = 0;
  
  for (const [wbsId, issueKey] of Object.entries(wbsToJira)) {
    const status = await getIssueStatus(issueKey);
    if (status) {
      updates[wbsId] = status;
      synced++;
      console.log(`   ${issueKey} (${wbsId}): ${status.status}`);
    }
  }
  
  updateVisualDoc(updates);
  
  console.log(`\n✅ Synced ${synced} issues`);
  console.log(`   View updated timeline: docs/VENDOR_SCHEDULING_MVP_VISUAL.md`);
}

sync().catch(error => {
  console.error('❌ Sync failed:', error);
  process.exit(1);
});
