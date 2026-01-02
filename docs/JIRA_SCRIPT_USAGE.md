# Jira WBS Import Script Usage

## Quick Start

The script `scripts/import-wbs-to-jira.mjs` uses Jira's REST API to create all WBS tasks programmatically.

## Prerequisites

1. **Jira API Token**:
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens
   - Click "Create API token"
   - Copy the token (you'll need it)

2. **Jira Project Key**:
   - Know your Jira project key (e.g., `BOOK`, `VSCHED`, etc.)
   - Or create a new project in Jira first

## Usage

### Dry Run (Test First)

```bash
JIRA_URL=https://your-domain.atlassian.net \
JIRA_EMAIL=your-email@example.com \
JIRA_API_TOKEN=your-api-token \
JIRA_PROJECT_KEY=BOOK \
DRY_RUN=true \
node scripts/import-wbs-to-jira.mjs
```

This will show what would be created without actually creating issues.

### Live Import

```bash
JIRA_URL=https://your-domain.atlassian.net \
JIRA_EMAIL=your-email@example.com \
JIRA_API_TOKEN=your-api-token \
JIRA_PROJECT_KEY=BOOK \
node scripts/import-wbs-to-jira.mjs
```

## What It Does

1. **Creates 18 past tasks** (marked as Done)
2. **Creates 6 milestones** (gate milestones)
3. **Creates 43 future tasks** (marked as To Do)
4. **Links dependencies** (creates "blocks" relationships)
5. **Sets proper fields**: Summary, Description, Priority, Due Date, Labels, Issue Type

## Output

The script will:
- Show progress for each issue created
- Display issue keys (e.g., `BOOK-123`)
- Link dependencies automatically
- Provide a summary at the end

Example output:
```
🚀 Starting Jira WBS import...
   Project: BOOK
   URL: https://your-domain.atlassian.net
   Mode: LIVE

✅ Connected as: Your Name (your-email@example.com)

📦 Creating past tasks (18 tasks)...
✅ Created: BOOK-1 - [P-001] Project repository initialization
✅ Created: BOOK-2 - [P-002] Next.js 15 + TypeScript scaffolding
...

🎯 Creating milestones (6 milestones)...
✅ Created: BOOK-19 - [M-REQ] REQ Baseline Approved
...

📋 Creating future tasks (43 tasks)...
✅ Created: BOOK-25 - [F-001] Requirements: Vendor availability hardening
...

🔗 Linking dependencies...
   🔗 Linked: BOOK-1 → BOOK-2
   🔗 Linked: BOOK-25 → BOOK-28
...

✅ Import complete!
   Total issues created: 67
   View in Jira: https://your-domain.atlassian.net/browse/BOOK
```

## Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `JIRA_URL` | Yes | Your Jira instance URL | `https://your-domain.atlassian.net` |
| `JIRA_EMAIL` | Yes | Your Jira email address | `you@example.com` |
| `JIRA_API_TOKEN` | Yes | Your Jira API token | `ATATT3xFfGF0...` |
| `JIRA_PROJECT_KEY` | No | Project key (defaults to `BOOK`) | `BOOK`, `VSCHED` |
| `DRY_RUN` | No | Set to `true` for dry run | `true` |

## Troubleshooting

### "Failed to connect to Jira"
- Check your `JIRA_URL` (should be your Atlassian domain)
- Verify `JIRA_EMAIL` and `JIRA_API_TOKEN` are correct
- Ensure API token hasn't expired

### "Invalid project key"
- Verify the project exists in Jira
- Check the project key is correct (case-sensitive)
- Ensure you have permission to create issues in that project

### "Issue type not found"
- The script tries to use: Task, Story, or Milestone
- If your project doesn't have these, you may need to customize the script
- Check available issue types: Jira → Project Settings → Issue Types

### "Priority not found"
- The script maps: Critical → Highest, High → High, Medium → Medium, Low → Low
- If your Jira uses different priority names, the script will use the first available priority

## Customization

To customize the script:

1. **Change issue types**: Edit the `issueTypeMap` object
2. **Change priorities**: Edit the `priorityMap` object
3. **Add custom fields**: Modify the `createIssue` function to include custom fields
4. **Change link types**: Modify the `linkIssues` function (currently uses "Blocks")

## Next Steps After Import

1. **Review issues** in Jira to ensure everything looks correct
2. **Assign owners** to tasks
3. **Create Epics** (optional) and link tasks to Epics
4. **Set up board views** (Kanban, Timeline/Gantt)
5. **Configure automation** for status transitions

## Alternative: Use Jira Extension

If you prefer using a Jira extension in VS Code/Cursor:

1. Install a Jira extension (e.g., "Jira and Bitbucket" by Atlassian)
2. Authenticate with your Jira instance
3. Use the extension's import feature or create issues manually
4. The CSV file (`docs/VENDOR_SCHEDULING_MVP_JIRA_IMPORT.csv`) is still available as backup

---

**Script Location**: `scripts/import-wbs-to-jira.mjs`  
**Total Issues**: 67 (18 past + 6 milestones + 43 future)
