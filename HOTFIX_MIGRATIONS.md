# 🚨 Emergency Hotfix Migrations

This file documents emergency migrations that bypass the normal CLI workflow due to critical production issues.

## Rules for Emergency Hotfixes

1. **Only for Production Emergencies**: Data corruption, security vulnerabilities, or critical bugs
2. **Must Include Documentation**: Each hotfix must be documented here with full justification
3. **Add Safety Comment**: File must contain `-- EMERGENCY HOTFIX` comment
4. **Get Team Approval**: Emergency hotfixes require approval from 2+ team members
5. **Follow Up**: Create proper migration via CLI after emergency is resolved

## Emergency Hotfix Log

### Template Entry:
```
## [YYYY-MM-DD] Migration: filename.sql
**Issue**: [Brief description of emergency]
**Risk**: [What happens if not fixed immediately]
**Approved By**: [Team member names]
**Follow-up**: [Link to proper migration PR]
```

---

*No emergency hotfixes recorded yet - let's keep it that way! 🎯*
