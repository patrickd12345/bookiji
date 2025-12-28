# Jarvis Phase 2 - SMS Commands & Human-in-the-Loop

**Status:** Implemented  
**Last Updated:** 2025-01-27

## Overview

Phase 2 adds human-in-the-loop command execution via SMS. This phase is split into three sub-phases (2A, 2B, 2C) that build on each other.

## Phase 2A: Human-in-the-Loop SMS Commands

**Status:** Implemented

Direct SMS command execution. Owner can reply to incident alerts or send standalone commands.

**Key Features:**
- SMS reply webhook (`POST /api/jarvis/sms-reply`)
- Deterministic intent parser
- Action registry (whitelist of executable actions)
- Guard rails (environment checks, sender verification)
- Feedback SMS with execution outcome
- Audit logging

**Supported Commands:**
- `ENABLE SCHEDULING` / `TURN ON SCHEDULING`
- `DISABLE SCHEDULING` / `TURN OFF SCHEDULING`

## Phase 2B: Human-in-the-Loop Playbooks

**Status:** Implemented

Multi-step response playbooks. Jarvis can propose a playbook, execute one step at a time, and require explicit SMS confirmation for each step.

**Key Features:**
- Playbook proposal based on incident type
- Step-by-step execution with SMS confirmation
- Rollback capability
- Playbook templates for common scenarios

## Phase 2C: Read-Only Situation Awareness

**Status:** Implemented

Read-only situational awareness via SMS. Owner can query incident status, understand root causes, track changes, and see available commands—all without triggering any actions.

**Supported Queries:**
- `STATUS` - Current incident status
- `WHY` - Root cause analysis
- `CHANGES` - Recent changes to system state
- `HELP` - Available commands and actions

## Implementation

All Phase 2 functionality is fully documented in the main Jarvis documentation:

**See:** [`docs/development/JARVIS_INCIDENT_COMMANDER.md`](../development/JARVIS_INCIDENT_COMMANDER.md)

The main document covers:
- Phase 2A: SMS command execution (lines 356-405)
- Phase 2B: Playbooks (lines 407-477)
- Phase 2C: Situation awareness (lines 478-651)
- Security and guard rails
- Example flows

## Next Phases

- **Phase 3**: Sleep-aware escalation
- **Phase 4**: Observability sanity checks
- **Phase 5**: Adaptive policy

