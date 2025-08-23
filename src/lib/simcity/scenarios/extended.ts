import { SimScenario, SimEvent } from '../scenarios';

// Extended Scenario Pack: Life-Saving Chaos Probes
export const EXTENDED_SCENARIOS: SimScenario[] = [
  {
    id: 'payments_gauntlet',
    name: 'Payments & Idempotency Chaos',
    description: 'Money bugs are reputation killers - test payment resilience under chaos',
    duration: {
      realMinutes: 10, // 10 real minutes
      simHours: 16      // = 16 simulated hours
    },
    policies: {
      customerSpawnRate: 0.4,
      vendorSpawnRate: 0.15,
      rescheduleChance: 0.3,
      cancelChance: 0.2,
      maxConcurrentAgents: 75,
      tickSpeedMs: 2500,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'PAYMENT_GATEWAY_OUTAGE',
        triggerAt: 30,  // 30 sim minutes
        duration: 15,   // 15 sim minutes
        parameters: { outageType: 'stripe_api_down' }
      },
      {
        type: 'PAYMENT_TIMEOUTS',
        triggerAt: 90,  // 1.5 sim hours
        duration: 30,   // 30 sim minutes
        parameters: { timeoutRate: 0.3 }
      },
      {
        type: 'WEBHOOK_DELAY_JITTER',
        triggerAt: 180, // 3 sim hours
        duration: 60,   // 1 sim hour
        parameters: { maxDelaySec: 120, reorderPct: 25 }
      }
    ],
    invariants: ['idempotent_payments', 'refund_symmetry', 'no_orphan_invoices', 'api_error_rate', 'cache_hit_rate']
  },
  {
    id: 'auth_gauntlet',
    name: 'Auth & Session Gauntlet',
    description: 'Real traffic dies on session edge-cases - test auth resilience',
    duration: {
      realMinutes: 8,  // 8 real minutes
      simHours: 12      // = 12 simulated hours
    },
    policies: {
      customerSpawnRate: 0.5,
      vendorSpawnRate: 0.2,
      rescheduleChance: 0.4,
      cancelChance: 0.25,
      maxConcurrentAgents: 100,
      tickSpeedMs: 2000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'FORCE_JWT_EXPIRY',
        triggerAt: 20,  // 20 sim minutes
        duration: 20,   // 20 sim minutes
        parameters: { burstPct: 40 }
      },
      {
        type: 'CLOCK_SKEW',
        triggerAt: 60,  // 1 sim hour
        duration: 30,   // 30 sim minutes
        parameters: { skewSeconds: 90 }
      },
      {
        type: 'RLS_POLICY_TOGGLE',
        triggerAt: 120, // 2 sim hours
        duration: 30,   // 30 sim minutes
        parameters: { policy: 'admin_only', flickerMin: 5 }
      }
    ],
    invariants: ['jwt_refresh_ok', 'clock_skew_tolerated', 'no_rls_regression', 'api_error_rate', 'orchestrator_tick_drift']
  },
  {
    id: 'isolation_check',
    name: 'Multi-Tenant Isolation Probe',
    description: 'One tenant leaking into another = instant incident',
    duration: {
      realMinutes: 8,  // 8 real minutes
      simHours: 12      // = 12 simulated hours
    },
    policies: {
      customerSpawnRate: 0.3,
      vendorSpawnRate: 0.1,
      rescheduleChance: 0.25,
      cancelChance: 0.15,
      maxConcurrentAgents: 60,
      tickSpeedMs: 3000,
      minutesPerTick: 10,
      tenants: ['simcity-a', 'simcity-b']
    },
    events: [
      {
        type: 'TENANT_MIXER',
        triggerAt: 30,  // 30 sim minutes
        duration: 60,   // 1 sim hour
        parameters: { tenants: ['simcity-a', 'simcity-b'], crossLoadPct: 50 }
      }
    ],
    invariants: ['no_cross_tenant_reads', 'cache_tenant_isolation', 'api_error_rate', 'cache_hit_rate']
  },
  {
    id: 'dst_chaos',
    name: 'DST & Calendar Chaos',
    description: 'Calendars explode twice a year - test time weirdness handling',
    duration: {
      realMinutes: 6,  // 6 real minutes
      simHours: 8       // = 8 simulated hours
    },
    policies: {
      customerSpawnRate: 0.4,
      vendorSpawnRate: 0.15,
      rescheduleChance: 0.5,
      cancelChance: 0.3,
      maxConcurrentAgents: 80,
      tickSpeedMs: 2500,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'SIMULATE_DST_TRANSITION',
        triggerAt: 20,  // 20 sim minutes
        duration: 30,   // 30 sim minutes
        parameters: { region: 'America/New_York' }
      },
      {
        type: 'USER_TZ_FLAP',
        triggerAt: 60,  // 1 sim hour
        duration: 20,   // 20 sim minutes
        parameters: { flipRate: 0.2 }
      }
    ],
    invariants: ['dst_safe_bookings', 'tz_normalization', 'reschedule_integrity', 'zero_double_bookings', 'api_error_rate']
  },
  {
    id: 'abuse_probe',
    name: 'Abuse & DoS Protection',
    description: 'Attackers are QA with malice - test abuse protection',
    duration: {
      realMinutes: 5,  // 5 real minutes
      simHours: 6       // = 6 simulated hours
    },
    policies: {
      customerSpawnRate: 0.2,
      vendorSpawnRate: 0.1,
      rescheduleChance: 0.2,
      cancelChance: 0.1,
      maxConcurrentAgents: 40,
      tickSpeedMs: 3000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'PATHOLOGICAL_INPUTS',
        triggerAt: 15,  // 15 sim minutes
        duration: 20,   // 20 sim minutes
        parameters: { maxPayloadKB: 512, unicodeWeirdness: true }
      },
      {
        type: 'IP_BURST',
        triggerAt: 45,  // 45 sim minutes
        duration: 15,   // 15 sim minutes
        parameters: { ipCount: 200, rpsPerIp: 5, target: '/api/search' }
      }
    ],
    invariants: ['abuse_throttled', 'input_sanitized', 'api_error_rate', 'orchestrator_tick_drift']
  },
  {
    id: 'webhook_storm',
    name: 'Webhook Storm & Exactly-Once',
    description: 'Providers resend. A lot. Test webhook resilience',
    duration: {
      realMinutes: 7,  // 7 real minutes
      simHours: 10      // = 10 simulated hours
    },
    policies: {
      customerSpawnRate: 0.35,
      vendorSpawnRate: 0.12,
      rescheduleChance: 0.3,
      cancelChance: 0.18,
      maxConcurrentAgents: 70,
      tickSpeedMs: 2800,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'WEBHOOK_STORM',
        triggerAt: 25,  // 25 sim minutes
        duration: 30,   // 30 sim minutes
        parameters: { dupPct: 60, burstMin: 10 }
      },
      {
        type: 'SMTP_BACKPRESSURE',
        triggerAt: 70,  // 70 sim minutes
        duration: 25,   // 25 sim minutes
        parameters: { dropRate: 0.5 }
      }
    ],
    invariants: ['webhook_exactly_once', 'api_error_rate', 'cache_hit_rate', 'orchestrator_tick_drift']
  },
  {
    id: 'deployment_roulette',
    name: 'Deployment & Migration Roulette',
    description: 'The riskiest minute of your week - test deployment safety',
    duration: {
      realMinutes: 12, // 12 real minutes
      simHours: 18      // = 18 simulated hours
    },
    policies: {
      customerSpawnRate: 0.3,
      vendorSpawnRate: 0.1,
      rescheduleChance: 0.25,
      cancelChance: 0.15,
      maxConcurrentAgents: 50,
      tickSpeedMs: 3000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'BLUE_GREEN_SWITCH',
        triggerAt: 30,  // 30 sim minutes
        duration: 20,   // 20 sim minutes
        parameters: { canaryPct: 10, durationMin: 20 }
      },
      {
        type: 'SCHEMA_MIGRATION_IN_FLIGHT',
        triggerAt: 90,  // 1.5 sim hours
        duration: 30,   // 30 sim minutes
        parameters: { ddl: 'add_nullable_col_then_backfill' }
      }
    ],
    invariants: ['zero_downtime_rollout', 'rollback_recovers', 'api_p95_response_time', 'api_error_rate', 'orchestrator_tick_drift']
  },
  {
    id: 'search_reindex',
    name: 'Search & Index Continuity',
    description: 'Reindex can starve reads - test search resilience',
    duration: {
      realMinutes: 8,  // 8 real minutes
      simHours: 12      // = 12 simulated hours
    },
    policies: {
      customerSpawnRate: 0.4,
      vendorSpawnRate: 0.15,
      rescheduleChance: 0.3,
      cancelChance: 0.2,
      maxConcurrentAgents: 80,
      tickSpeedMs: 2500,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'FTS_REINDEX',
        triggerAt: 20,  // 20 sim minutes
        duration: 10,   // 10 sim minutes
        parameters: { durationMin: 10 }
      },
      {
        type: 'MATVIEW_REFRESH_THROTTLE',
        triggerAt: 60,  // 1 sim hour
        duration: 30,   // 30 sim minutes
        parameters: { slowdownPct: 60 }
      }
    ],
    invariants: ['search_continuity', 'no_stale_visibility', 'api_p95_response_time', 'cache_hit_rate', 'orchestrator_tick_drift']
  },
  {
    id: 'storage_resilience',
    name: 'File Upload & Storage Resilience',
    description: 'Uploads fail more often than we admit - test storage resilience',
    duration: {
      realMinutes: 6,  // 6 real minutes
      simHours: 8       // = 8 simulated hours
    },
    policies: {
      customerSpawnRate: 0.3,
      vendorSpawnRate: 0.1,
      rescheduleChance: 0.25,
      cancelChance: 0.15,
      maxConcurrentAgents: 50,
      tickSpeedMs: 3000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'S3_LATENCY_SPIKES',
        triggerAt: 20,  // 20 sim minutes
        duration: 25,   // 25 sim minutes
        parameters: { p99Ms: 2000 }
      },
      {
        type: 'SIGNED_URL_EARLY_EXPIRY',
        triggerAt: 55,  // 55 sim minutes
        duration: 15,   // 15 sim minutes
        parameters: { minLeftSec: 30 }
      }
    ],
    invariants: ['upload_resilience', 'signed_url_enforced', 'api_error_rate', 'orchestrator_tick_drift']
  }
];

// Quick CI scenarios for fast validation
export const CI_QUICK_SCENARIOS: SimScenario[] = [
  {
    id: 'payments_lite',
    name: 'Payments-Lite (CI)',
    description: '5 min payment validation for CI/CD',
    duration: {
      realMinutes: 5,  // 5 real minutes
      simHours: 8       // = 8 simulated hours
    },
    policies: {
      customerSpawnRate: 0.3,
      vendorSpawnRate: 0.1,
      maxConcurrentAgents: 40,
      tickSpeedMs: 3000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'PAYMENT_TIMEOUTS',
        triggerAt: 15,  // 15 sim minutes
        duration: 20,   // 20 sim minutes
        parameters: { timeoutRate: 0.3 }
      }
    ],
    invariants: ['idempotent_payments', 'refund_symmetry', 'api_error_rate']
  },
  {
    id: 'auth_lite',
    name: 'Auth-Lite (CI)',
    description: '3 min auth validation for CI/CD',
    duration: {
      realMinutes: 3,  // 3 real minutes
      simHours: 4       // = 4 simulated hours
    },
    policies: {
      customerSpawnRate: 0.25,
      vendorSpawnRate: 0.08,
      maxConcurrentAgents: 30,
      tickSpeedMs: 3500,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'FORCE_JWT_EXPIRY',
        triggerAt: 10,  // 10 sim minutes
        duration: 15,   // 15 sim minutes
        parameters: { burstPct: 40 }
      },
      {
        type: 'CLOCK_SKEW',
        triggerAt: 30,  // 30 sim minutes
        duration: 10,   // 10 sim minutes
        parameters: { skewSeconds: 90 }
      }
    ],
    invariants: ['jwt_refresh_ok', 'clock_skew_tolerated', 'api_error_rate']
  },
  {
    id: 'abuse_lite',
    name: 'Abuse-Lite (CI)',
    description: '2 min abuse protection validation for CI/CD',
    duration: {
      realMinutes: 2,  // 2 real minutes
      simHours: 3       // = 3 simulated hours
    },
    policies: {
      customerSpawnRate: 0.2,
      vendorSpawnRate: 0.05,
      maxConcurrentAgents: 25,
      tickSpeedMs: 4000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'IP_BURST',
        triggerAt: 8,   // 8 sim minutes
        duration: 12,   // 12 sim minutes
        parameters: { ipCount: 200, rpsPerIp: 5, target: '/api/search' }
      }
    ],
    invariants: ['abuse_throttled', 'input_sanitized', 'api_error_rate']
  }
];

// All extended scenarios
export const ALL_EXTENDED_SCENARIOS = [
  ...EXTENDED_SCENARIOS,
  ...CI_QUICK_SCENARIOS
];
