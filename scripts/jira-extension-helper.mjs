#!/usr/bin/env node
/**
 * Jira Extension Helper
 * 
 * Attempts to read Jira credentials from VS Code/Cursor extension storage
 * Falls back to environment variables if extension storage not found
 * 
 * Usage:
 *   node scripts/jira-extension-helper.mjs
 *   # Or with env vars as fallback:
 *   JIRA_URL=... JIRA_EMAIL=... JIRA_API_TOKEN=... node scripts/jira-extension-helper.mjs
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

const OS = process.platform;
const isWindows = OS === 'win32';

// Extension storage locations
const extensionPaths = [
  // Cursor (Windows)
  isWindows ? join(process.env.APPDATA || '', 'Cursor', 'User', 'globalStorage') : null,
  // VS Code (Windows)
  isWindows ? join(process.env.APPDATA || '', 'Code', 'User', 'globalStorage') : null,
  // VS Code (macOS)
  !isWindows ? join(homedir(), 'Library', 'Application Support', 'Code', 'User', 'globalStorage') : null,
  // VS Code (Linux)
  !isWindows ? join(homedir(), '.config', 'Code', 'User', 'globalStorage') : null,
].filter(Boolean);

// Common Jira extension IDs
const jiraExtensionIds = [
  'atlassian.atlascode',           // Atlassian for VS Code
  'atlassian.atlascode-jira',      // Jira and Bitbucket
  'ms-vscode.vscode-jira',         // Jira (other)
];

/**
 * Try to find Jira extension storage
 */
function findJiraExtensionStorage() {
  for (const basePath of extensionPaths) {
    if (!existsSync(basePath)) continue;

    for (const extId of jiraExtensionIds) {
      const extPath = join(basePath, extId);
      if (existsSync(extPath)) {
        return extPath;
      }
    }

    // Also check for any directory with "jira" or "atlassian" in name
    try {
      const dirs = require('fs').readdirSync(basePath, { withFileTypes: true });
      for (const dir of dirs) {
        if (dir.isDirectory()) {
          const name = dir.name.toLowerCase();
          if (name.includes('jira') || name.includes('atlassian')) {
            return join(basePath, dir.name);
          }
        }
      }
    } catch (e) {
      // Ignore read errors
    }
  }
  return null;
}

/**
 * Try to read credentials from extension storage
 */
function readExtensionCredentials() {
  const extPath = findJiraExtensionStorage();
  if (!extPath) {
    return null;
  }

  console.log(`📁 Found extension storage: ${extPath}`);

  // Common storage file names
  const storageFiles = [
    'state.vscdb',
    'workspaceState.json',
    'settings.json',
    'credentials.json',
    'state.json',
  ];

  for (const file of storageFiles) {
    const filePath = join(extPath, file);
    if (existsSync(filePath)) {
      try {
        const content = readFileSync(filePath, 'utf8');
        
        // Try to parse as JSON
        let data;
        try {
          data = JSON.parse(content);
        } catch (e) {
          // Might be SQLite database (state.vscdb) - skip for now
          continue;
        }

        // Look for Jira-related keys
        const jiraKeys = Object.keys(data).filter(k => 
          k.toLowerCase().includes('jira') || 
          k.toLowerCase().includes('atlassian') ||
          k.toLowerCase().includes('url') ||
          k.toLowerCase().includes('token')
        );

        if (jiraKeys.length > 0) {
          console.log(`   Found potential Jira data in ${file}`);
          return { file, data, keys: jiraKeys };
        }
      } catch (e) {
        // Skip files we can't read
      }
    }
  }

  return null;
}

/**
 * Main function
 */
function main() {
  console.log('🔍 Searching for Jira extension credentials...\n');

  // Try extension storage first
  const extCreds = readExtensionCredentials();
  
  if (extCreds) {
    console.log(`✅ Found extension storage data`);
    console.log(`   File: ${extCreds.file}`);
    console.log(`   Keys: ${extCreds.keys.join(', ')}`);
    console.log(`\n⚠️  Note: Extension storage format varies.`);
    console.log(`   You may still need to use API tokens manually.`);
    console.log(`   Extension credentials are often encrypted or in proprietary format.`);
  } else {
    console.log(`❌ Could not find Jira extension storage`);
    console.log(`   Searched locations:`);
    extensionPaths.forEach(path => console.log(`   - ${path}`));
  }

  // Check environment variables
  console.log(`\n📋 Environment variables:`);
  const hasUrl = !!process.env.JIRA_URL;
  const hasEmail = !!process.env.JIRA_EMAIL;
  const hasToken = !!process.env.JIRA_API_TOKEN;
  
  console.log(`   JIRA_URL: ${hasUrl ? '✅ Set' : '❌ Not set'}`);
  console.log(`   JIRA_EMAIL: ${hasEmail ? '✅ Set' : '❌ Not set'}`);
  console.log(`   JIRA_API_TOKEN: ${hasToken ? '✅ Set' : '❌ Not set'}`);

  if (hasUrl && hasEmail && hasToken) {
    console.log(`\n✅ You can use environment variables for authentication`);
  } else {
    console.log(`\n💡 Tip: Most Jira extensions don't expose credentials programmatically.`);
    console.log(`   You'll need to use API tokens (https://id.atlassian.com/manage-profile/security/api-tokens)`);
    console.log(`   Or use the extension's UI to create/view issues manually.`);
  }
}

main();
