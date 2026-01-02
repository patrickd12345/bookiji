# Jira Import Instructions - Vendor Scheduling MVP WBS

## Quick Import Steps

1. **Open Jira** → Go to your project
2. **Click "..." menu** (top right) → **"Import issues from CSV"**
   - Or: **Project Settings** → **Import** → **CSV**
3. **Select the CSV file**: `docs/VENDOR_SCHEDULING_MVP_JIRA_IMPORT.csv`
4. **Map fields** (Jira will auto-detect most):
   - `Summary` → Summary
   - `Issue Type` → Issue Type
   - `Description` → Description
   - `Status` → Status
   - `Priority` → Priority
   - `Due Date` → Due Date
   - `Labels` → Labels (comma-separated)
   - `Components` → Components
   - `Epic Link` → Epic Link (if you have an Epic created)

## Field Mappings

| CSV Column | Jira Field | Notes |
|------------|------------|-------|
| Summary | Summary | Includes WBS ID prefix (e.g., "[F-001]") |
| Issue Type | Issue Type | Task, Story, or Milestone |
| Description | Description | Full task details, dependencies, deliverables |
| Status | Status | Done (past), To Do (future), In Progress |
| Priority | Priority | Critical, High, Medium, Low |
| Due Date | Due Date | Target completion date (YYYY-MM-DD) |
| Labels | Labels | Phase tags (past/future, build/verify, etc.) |
| Components | Components | "Vendor Scheduling MVP" |
| Epic Link | Epic Link | Link to parent Epic (if using Epics) |

## Pre-Import Checklist

1. **Create Epic** (optional but recommended):
   - Create Epic: "Vendor Scheduling MVP"
   - Note the Epic Key (e.g., `BOOK-123`)
   - Update CSV `Epic Link` column with Epic Key, or map after import

2. **Verify Issue Types**:
   - Ensure your Jira project has: Task, Story, Milestone
   - If not, create them or map to existing types

3. **Verify Statuses**:
   - Ensure these statuses exist: Done, To Do, In Progress
   - Jira will create missing statuses or map to closest match

4. **Verify Priorities**:
   - Ensure these priorities exist: Critical, High, Medium, Low
   - Adjust if your project uses different priority names

## Post-Import Steps

1. **Link Dependencies**:
   - The CSV includes dependency info in descriptions
   - Manually create "blocks" or "depends on" links using WBS IDs
   - Or use Jira automation to parse descriptions and create links

2. **Create Epic Hierarchy** (optional):
   - Create Epics for major scope blocks:
     - "Vendor Availability Hardening"
     - "Calendar Sync 2-Way"
     - "Loyalty/Credits Reconciliation"
     - "Go-to-Market Readiness"
   - Link tasks to appropriate Epics

3. **Set Up Board Views**:
   - Create Kanban board grouped by Phase
   - Create Timeline/Gantt view (if using Jira Advanced Roadmaps)
   - Filter by Labels: `future` for active work

4. **Configure Custom Fields** (optional):
   - Add custom field for "WBS ID" (text)
   - Add custom field for "% Complete" (number)
   - Add custom field for "Start Date" (date)
   - Update issues with these values

## Automation Suggestions

### Auto-link Dependencies
Create Jira automation rule:
- **Trigger**: Issue created
- **Condition**: Description contains "Dependencies:"
- **Action**: Parse dependencies, create "blocks" links

### Status Updates
Create automation to update status based on:
- Due date approaching → Set to "In Progress"
- Past due date → Set priority to "High"

### Epic Linking
If using Epics, create automation:
- **Trigger**: Issue created with label "vendor-availability"
- **Action**: Link to "Vendor Availability Hardening" Epic

## Troubleshooting

**Issue**: "Invalid Issue Type"
- **Fix**: Map CSV Issue Type to your project's available types in import wizard

**Issue**: "Status not found"
- **Fix**: Jira will suggest closest match, or create status first

**Issue**: "Epic Link not found"
- **Fix**: Create Epic first, note the Key, update CSV or map in import wizard

**Issue**: "Date format error"
- **Fix**: Ensure dates are YYYY-MM-DD format (already correct in CSV)

## Alternative: Manual Import via Jira Extension

If you're using a Jira extension in VS Code/Cursor:

1. **Install Jira extension** (if not already installed)
2. **Authenticate** with your Jira instance
3. **Use extension's import feature**:
   - Some extensions support CSV import
   - Or create issues one-by-one using extension commands
4. **Bulk create** using extension's bulk create feature

## Next Steps

After import:
1. Review all issues in Jira
2. Assign owners to tasks
3. Set up sprint/iteration planning
4. Configure dashboards and reports
5. Set up notifications for milestone dates

---

**CSV File Location**: `docs/VENDOR_SCHEDULING_MVP_JIRA_IMPORT.csv`  
**Total Issues**: 61 (18 past tasks, 43 future tasks, 6 milestones)  
**Import Time**: ~2-5 minutes depending on Jira instance speed
