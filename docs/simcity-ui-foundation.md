# SimCity Control Plane — Phase 2: UI Foundation & Contracts

## 1. Overview
The SimCity Control Plane UI is designed as a "Mission Control" center for the Bookiji platform. It provides high-fidelity visibility into the platform's stability under stress and allows operators to orchestrate chaos runs safely.

## 2. API Contracts (JSON Shapes)

### Run Request Object
```json
{
  "id": "uuid",
  "requested_by": "string (email or system-id)",
  "tier": "A | B | C",
  "seed": "string (optional)",
  "concurrency": 5,
  "max_events": 100,
  "duration_seconds": 60,
  "status": "PENDING | RUNNING | STOPPED | COMPLETED | FAILED",
  "created_at": "iso-timestamp",
  "started_at": "iso-timestamp | null",
  "ended_at": "iso-timestamp | null",
  "run_id": "uuid | null (link to detailed simcity_runs entry)"
}
```

### Run Detail (from simcity_runs)
```json
{
  "id": "uuid",
  "tier": "A | B | C",
  "seed": 12345678,
  "result": "PASS | FAIL",
  "fail_invariant": "string | null",
  "fail_event_index": 42,
  "started_at": "iso-timestamp",
  "ended_at": "iso-timestamp"
}
```

## 3. UI Concept: Admin Cockpit — SimCity Panel

### Visual Aesthetic
*   **Dark Mode Only**: High-contrast, neon-accented (electric blue, matrix green, warning amber, critical red).
*   **Ops Grid**: Modular layout with "monolithic" components.

### Core Components
1.  **Run Orchestration Panel**:
    *   Form to trigger new runs (Tier selection, concurrency slider, seed override).
    *   Large "INITIATE SIMULATION" button with a confirmation countdown.
2.  **Simulation Pulse**:
    *   A central heartbeat wave that animates while a run is active.
    *   Frequency increases with concurrency.
3.  **Run History Timeline**:
    *   Vertical or horizontal timeline of recent runs.
    *   Color-coded indicators (Green = PASS, Red = FAIL).
    *   One-click "REPLAY UNIVERSE" button on historical runs to re-run with the same seed.
4.  **Metric Dials**:
    *   Real-time counters for "Bookings Attempted", "Invariants Checked", "Success Rate".
    *   Circular gauges with glowing needles.
5.  **Slot Contention Heatmap**:
    *   Grid view of availability slots, glowing brighter where contention (parallel booking attempts) is highest.
6.  **Forensic Terminal**:
    *   A scrolling log area showing live events from the simulation.
    *   Errors highlighted in glowing red with a "view stack" link.

## 4. Tone
"Mission control, not spreadsheet." Every action should feel impactful. Data is dense but prioritized.

