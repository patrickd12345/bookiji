# Jarvis Phase 3 - Sleep-Aware Escalation & Attention Management

**Status:** Implemented  
**Last Updated:** 2025-01-27

## Overview

Phase 3 adds sleep-aware escalation and attention management. Jarvis decides how loudly to notify, when, and how often based on incident severity, time of day, owner response, and explicit sleep preferences.

## Key Features

- **Sleep-Aware Notifications**: Respects quiet hours (22:00-07:00)
- **Severity-Based Escalation**: SEV-1 wakes immediately, SEV-2 waits unless escalates
- **Hard Caps**: Maximum 5 SMS notifications per incident
- **Tone Profiles**: Different notification styles based on severity and time
- **Attention Management**: Tracks last wake time, availability constraints, severity drift
- **ACK Command**: Freezes escalation when owner acknowledges

## Escalation Rules

- **SEV-1**: Wake once, then wait for response
- **SEV-2**: No wake unless severity increases
- **Repeat Alerts**: Suppressed unless state meaningfully changes
- **Quiet Hours**: 22:00-07:00 (configurable)
- **Hard Cap**: Maximum 5 notifications per incident

## Implementation

Phase 3 functionality is fully documented in the main Jarvis documentation:

**See:** [`docs/development/JARVIS_INCIDENT_COMMANDER.md`](../development/JARVIS_INCIDENT_COMMANDER.md)

The main document covers:
- Phase 3: Sleep-aware escalation (lines 652-795)
- Configuration and thresholds
- Escalation logic
- Attention management
- Safety guarantees

## Next Phases

- **Phase 4**: Observability sanity checks
- **Phase 5**: Adaptive policy

