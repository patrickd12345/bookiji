export interface SimScenario {
  id: string;
  name: string;
  description: string;
  duration: {
    realMinutes: number;
    simHours: number;
  };
  policies: Record<string, any>;
  events: SimEvent[];
  invariants: string[]; // Invariant IDs to check
}

export interface SimEvent {
  type: 'CACHE_INVALIDATION_STORM' | 'PAUSE_MV_REFRESH' | 'RLS_MISCONFIG' | 'RATE_LIMIT_BURST';
  triggerAt: number; // Simulated minutes from start
  duration: number; // Duration in simulated minutes
  parameters?: Record<string, any>;
}

// Scenario Pack: Four phases to shake different failure modes
export const SCENARIO_PACK: SimScenario[] = [
  {
    id: 'baseline',
    name: 'Baseline (Normal Load)',
    description: 'Normal spawn rates with all invariants checked',
    duration: {
      realMinutes: 12, // 12 real minutes
      simHours: 20     // = 20 simulated hours
    },
    policies: {
      customerSpawnRate: 0.3,
      vendorSpawnRate: 0.1,
      rescheduleChance: 0.35,
      cancelChance: 0.15,
      maxConcurrentAgents: 50,
      tickSpeedMs: 3000,
      minutesPerTick: 10
    },
    events: [],
    invariants: ['api_p95_response_time', 'api_p99_response_time', 'api_error_rate', 'booking_funnel_success', 'vendor_sla_response', 'cache_hit_rate', 'zero_double_bookings', 'no_orphaned_references', 'orchestrator_tick_drift']
  },
  {
    id: 'growth_curve',
    name: 'Growth Curve (Load Testing)',
    description: '2x spawn every 6 sim hours to test scaling',
    duration: {
      realMinutes: 29, // 29 real minutes
      simHours: 48     // = 48 simulated hours
    },
    policies: {
      customerSpawnRate: 0.6, // Start at 2x
      vendorSpawnRate: 0.2,
      rescheduleChance: 0.35,
      cancelChance: 0.15,
      maxConcurrentAgents: 100,
      tickSpeedMs: 3000,
      minutesPerTick: 10
    },
    events: [
      {
        type: 'RATE_LIMIT_BURST',
        triggerAt: 360, // 6 sim hours
        duration: 60,   // 1 sim hour
        parameters: { multiplier: 2.0 }
      },
      {
        type: 'RATE_LIMIT_BURST',
        triggerAt: 720, // 12 sim hours
        duration: 60,
        parameters: { multiplier: 2.5 }
      },
      {
        type: 'RATE_LIMIT_BURST',
        triggerAt: 1080, // 18 sim hours
        duration: 60,
        parameters: { multiplier: 3.0 }
      }
    ],
    invariants: ['api_p95_response_time', 'api_p99_response_time', 'api_error_rate', 'cache_hit_rate', 'cache_invalidation_spike', 'orchestrator_tick_drift', 'memory_usage']
  },
  {
    id: 'disaster_mix',
    name: 'Disaster Mix (Chaos Engineering)',
    description: 'Trigger multiple failure modes to test self-healing',
    duration: {
      realMinutes: 3.6, // 3.6 real minutes
      simHours: 6        // = 6 simulated hours
    },
    policies: {
      customerSpawnRate: 0.8, // High load
      vendorSpawnRate: 0.3,
      rescheduleChance: 0.5,
      cancelChance: 0.3,
      maxConcurrentAgents: 150,
      tickSpeedMs: 2000, // Faster ticks
      minutesPerTick: 10
    },
    events: [
      {
        type: 'CACHE_INVALIDATION_STORM',
        triggerAt: 30,  // 30 sim minutes
        duration: 30,   // 30 sim minutes
        parameters: { invalidationRate: 0.8 }
      },
      {
        type: 'PAUSE_MV_REFRESH',
        triggerAt: 90,  // 1.5 sim hours
        duration: 60,   // 1 sim hour
        parameters: { pauseDuration: 60 }
      },
      {
        type: 'RLS_MISCONFIG',
        triggerAt: 180, // 3 sim hours
        duration: 30,   // 30 sim minutes
        parameters: { misconfigType: 'admin_access' }
      }
    ],
    invariants: ['api_error_rate', 'cache_hit_rate', 'cache_invalidation_spike', 'orchestrator_tick_drift', 'memory_usage']
  },
  {
    id: 'soak',
    name: 'Soak (Stability Testing)',
    description: 'Low/steady traffic to catch memory leaks and drift',
    duration: {
      realMinutes: 1008, // 1008 real minutes = 16.8 hours
      simHours: 168       // = 7 simulated days
    },
    policies: {
      customerSpawnRate: 0.1, // Low load
      vendorSpawnRate: 0.05,
      rescheduleChance: 0.2,
      cancelChance: 0.1,
      maxConcurrentAgents: 25,
      tickSpeedMs: 5000, // Slower ticks
      minutesPerTick: 10
    },
    events: [],
    invariants: ['orchestrator_tick_drift', 'memory_usage', 'api_error_rate', 'cache_hit_rate']
  }
];

// Scenario executor
export class ScenarioExecutor {
  private currentScenario: SimScenario | null = null;
  private startTime: Date | null = null;
  private eventTimers: NodeJS.Timeout[] = [];
  private onEvent: (event: SimEvent) => void;

  constructor(onEvent: (event: SimEvent) => void) {
    this.onEvent = onEvent;
  }

  async startScenario(scenarioId: string): Promise<SimScenario> {
    const scenario = SCENARIO_PACK.find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    this.currentScenario = scenario;
    this.startTime = new Date();
    
    // Schedule events
    this.scheduleEvents(scenario);
    
    return scenario;
  }

  private scheduleEvents(scenario: SimScenario): void {
    // Clear existing timers
    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers = [];

    scenario.events.forEach(event => {
      const realTimeMs = (event.triggerAt / scenario.duration.simHours) * scenario.duration.realMinutes * 60 * 1000;
      
      const timer = setTimeout(() => {
        this.triggerEvent(event);
      }, realTimeMs);
      
      this.eventTimers.push(timer);
    });
  }

  private triggerEvent(event: SimEvent): void {
    console.log(`🔴 SimCity Event Triggered: ${event.type}`);
    this.onEvent(event);
  }

  getCurrentScenario(): SimScenario | null {
    return this.currentScenario;
  }

  getElapsedTime(): { real: number; simulated: number } | null {
    if (!this.startTime || !this.currentScenario) {
      return null;
    }

    const realElapsedMs = Date.now() - this.startTime.getTime();
    const realElapsedMinutes = realElapsedMs / (60 * 1000);
    const simulatedElapsedHours = (realElapsedMinutes / this.currentScenario.duration.realMinutes) * this.currentScenario.duration.simHours;

    return {
      real: realElapsedMinutes,
      simulated: simulatedElapsedHours
    };
  }

  getProgress(): number | null {
    if (!this.currentScenario) return null;
    
    const elapsed = this.getElapsedTime();
    if (!elapsed) return 0;
    
    return Math.min(100, (elapsed.real / this.currentScenario.duration.realMinutes) * 100);
  }

  isComplete(): boolean {
    const progress = this.getProgress();
    return progress !== null && progress >= 100;
  }

  stop(): void {
    this.eventTimers.forEach(timer => clearTimeout(timer));
    this.eventTimers = [];
    this.currentScenario = null;
    this.startTime = null;
  }
}

// Quick control API helpers
export const QUICK_CONTROLS = {
  startBaseline: () => ({ scenario: 'baseline', duration: '12 real minutes = 20 sim hours' }),
  startGrowthCurve: () => ({ scenario: 'growth_curve', duration: '29 real minutes = 48 sim hours' }),
  startDisasterMix: () => ({ scenario: 'disaster_mix', duration: '3.6 real minutes = 6 sim hours' }),
  startSoak: () => ({ scenario: 'soak', duration: '16.8 real hours = 7 sim days' }),
  
  // Policy adjustments
  highLoad: () => ({ customerSpawnRate: 0.8, vendorSpawnRate: 0.4, maxConcurrentAgents: 200 }),
  lowLoad: () => ({ customerSpawnRate: 0.1, vendorSpawnRate: 0.05, maxConcurrentAgents: 25 }),
  aggressive: () => ({ rescheduleChance: 0.7, cancelChance: 0.4, customerPatienceThreshold: 5 }),
  conservative: () => ({ rescheduleChance: 0.1, cancelChance: 0.05, customerPatienceThreshold: 20 }),
  
  // Disaster triggers
  cacheStorm: () => ({ type: 'CACHE_INVALIDATION_STORM', durationMin: 30, invalidationRate: 0.8 }),
  mvPause: () => ({ type: 'PAUSE_MV_REFRESH', durationMin: 60 }),
  rlsMisconfig: () => ({ type: 'RLS_MISCONFIG', durationMin: 30, misconfigType: 'admin_access' }),
  rateLimitBurst: () => ({ type: 'RATE_LIMIT_BURST', durationMin: 15, multiplier: 3.0 })
};
