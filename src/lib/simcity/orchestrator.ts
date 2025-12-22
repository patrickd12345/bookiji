import { EventEmitter } from 'events';
import { SimTelemetry } from './telemetry';
import {
  DEFAULT_METRICS,
  DEFAULT_POLICIES,
  SimEventPayload,
  SimEventType,
  SimMetrics,
  SimPolicies,
  SimRunInfo,
  SimState,
} from './types';
import { InvariantViolation } from './types';
import { InvariantChecker } from './invariants';

export class SimOrchestrator extends EventEmitter {
  private state: SimState;
  private running = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private telemetry: SimTelemetry;
  private agentCounter = 0;
  private invariantChecker: InvariantChecker | null = null;
  private currentRunId: string | null = null;
  private currentSeed: number | null = null;
  private currentScenario: string | null = null;
  private startedAt: Date | null = null;
  private finishedAt: Date | null = null;
  private lastTickAt: Date | null = null;
  private violations: InvariantViolation[] = [];
  private rng: () => number = Math.random;

  constructor(_baseURL: string = 'http://localhost:3000') {
    super();
    this.telemetry = new SimTelemetry();
    this.state = {
      running: false,
      tick: 0,
      nowISO: new Date().toISOString(),
      liveAgents: 0,
      metrics: { ...DEFAULT_METRICS },
      policies: { ...DEFAULT_POLICIES },
      scenario: null,
      runInfo: null,
    };
  }

  async start(options?: { seed?: number; scenario?: string; policies?: Partial<SimPolicies> }): Promise<void> {
    if (this.running) {
      throw new Error('Simulation is already running');
    }

    // Generate run ID and seed
    this.currentSeed = options?.seed || Math.floor(Math.random() * 1000000);
    this.rng = this.createRng(this.currentSeed);
    this.currentRunId = `simcity_${Date.now()}_${this.rng().toString(36).substr(2, 9)}`;
    this.currentScenario = options?.scenario || null;
    this.startedAt = new Date();
    this.finishedAt = null;
    this.lastTickAt = null;
    this.violations = [];
    
    // Initialize invariant checker
    this.invariantChecker = new InvariantChecker(this.currentRunId, this.currentSeed);
    
    // Apply custom policies if provided
    if (options?.policies) {
      this.state.policies = { ...this.state.policies, ...options.policies };
    }

    this.running = true;
    this.state.running = true;
    this.state.startTime = this.startedAt?.toISOString();
    this.state.tick = 0;
    this.state.nowISO = new Date().toISOString();
    this.state.scenario = this.currentScenario;
    this.state.runInfo = this.getRunInfo();
    
    this.telemetry.start();
    this.emitEvent('start', { 
      startTime: this.state.startTime,
      runId: this.currentRunId,
      seed: this.currentSeed,
      scenario: this.currentScenario || 'manual'
    });
    
    this.tickInterval = setInterval(() => {
      this.tick();
    }, this.state.policies.tickSpeedMs);
  }

  async stop(): Promise<void> {
    if (!this.running) {
      throw new Error('Simulation is not running');
    }

    this.running = false;
    this.state.running = false;
    this.finishedAt = new Date();
    this.state.runInfo = this.getRunInfo();
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    this.emitEvent('stop', { stopTime: this.finishedAt?.toISOString() });
  }

  private async tick(): Promise<void> {
    this.state.tick++;
    this.lastTickAt = new Date();
    this.state.nowISO = this.advanceSimulatedTime();
    this.state.lastTickTime = this.lastTickAt?.toISOString();
    this.state.runInfo = this.getRunInfo();
    
    this.emitEvent('tick', { 
      tick: this.state.tick, 
      simulatedTime: this.state.nowISO,
      liveAgents: this.state.liveAgents 
    });

    // Spawn new agents based on policies
    await this.spawnAgents();
    
    // Update metrics
    const metrics = this.getMetrics();
    this.state.metrics = metrics;
    this.state.liveAgents = metrics.activeAgents;
  }

  private advanceSimulatedTime(): string {
    const now = new Date();
    const minutesToAdd = this.state.policies.minutesPerTick;
    const newTime = new Date(now.getTime() + (minutesToAdd * 60 * 1000));
    return newTime.toISOString();
  }

  private async spawnAgents(): Promise<void> {
    const currentHour = new Date(this.state.nowISO).getHours();
    const isVendorHours = currentHour >= this.state.policies.vendorOpenHours.start && 
                          currentHour <= this.state.policies.vendorOpenHours.end;

    // Spawn customers
    if (this.rng() < this.state.policies.customerSpawnRate) {
      await this.spawnAgent('customer');
    }

    // Spawn vendors only during business hours
    if (isVendorHours && this.rng() < this.state.policies.vendorSpawnRate) {
      await this.spawnAgent('vendor');
    }
  }

  private async spawnAgent(kind: 'customer' | 'vendor'): Promise<void> {
    if (this.state.liveAgents >= this.state.policies.maxConcurrentAgents) {
      return; // At capacity
    }

    const id = ++this.agentCounter;
    
    this.emitEvent('agent_spawn', { 
      id, 
      kind, 
      timestamp: new Date().toISOString() 
    });

    // Run agent in background
    this.runAgent(kind, id);
  }

  private async runAgent(kind: 'customer' | 'vendor', id: number): Promise<void> {
    try {
      // Simulate agent running
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      this.emitEvent('agent_done', {
        id,
        kind,
        result: {
          kind,
          success: true,
          latencyTicks: 1,
          actions: []
        },
        timestamp: new Date().toISOString(),
        duration: Date.now() - (this.lastTickAt?.getTime() || Date.now()),
      });
      
      // Update telemetry
      this.telemetry.log({
        type: 'agent_done',
        timestamp: new Date().toISOString(),
        data: { id, kind }
      });
      
    } catch (error) {
      console.error(`Agent ${id} (${kind}) failed:`, error);
      
      this.emitEvent('agent_done', {
        id,
        kind,
        result: {
          kind,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          actions: [],
          latencyTicks: 0,
        },
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  setPolicies(policies: Partial<SimPolicies>): void {
    this.state.policies = { ...this.state.policies, ...policies };
    
    // Update tick speed if changed
    if (policies.tickSpeedMs && this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = setInterval(() => {
        this.tick();
      }, this.state.policies.tickSpeedMs);
    }
    
    this.emitEvent('policy_change', { 
      policies: this.state.policies,
      timestamp: new Date().toISOString() 
    });
  }

  getState(): SimState {
    return { 
      ...this.state,
      metrics: { ...this.state.metrics },
      policies: { ...this.state.policies },
      runInfo: this.getRunInfo(),
    };
  }

  getMetrics(): SimMetrics {
    const metrics = this.telemetry.snapshot();
    metrics.totalBookings = metrics.bookingsCreated;
    metrics.cancelledBookings = metrics.cancels;
    metrics.errors = metrics.errorCount;
    metrics.chats = metrics.chatVolume;
    metrics.revenue = metrics.skinFeesCollected || metrics.bookingsCreated * this.state.policies.skinFee;
    metrics.skinFeesCollected = metrics.revenue;
    this.state.metrics = metrics;
    return this.state.metrics;
  }

  getEvents(limit?: number) {
    return this.telemetry.getRecentEvents(limit);
  }

  reset(): void {
    this.telemetry.reset();
    this.state.metrics = { ...DEFAULT_METRICS };
    this.state.tick = 0;
    this.state.liveAgents = 0;
    this.agentCounter = 0;
    this.currentRunId = null;
    this.currentSeed = null;
    this.currentScenario = null;
    this.startedAt = null;
    this.finishedAt = null;
    this.rng = Math.random;
    this.state.startTime = undefined;
    this.state.lastTickTime = undefined;
    this.state.runInfo = this.getRunInfo();
    this.state.scenario = null;
    this.violations = [];
    this.emitEvent('reset', { timestamp: new Date().toISOString() });
  }

  emitSimEvent(type: SimEventType, data: any): void {
    this.emitEvent(type, data);
  }

  private emitEvent(type: SimEventType, data: any): void {
    const runInfo = this.getRunInfo();
    const event: SimEventPayload = {
      type,
      timestamp: new Date().toISOString(),
      runId: runInfo.runId,
      scenario: runInfo.scenario,
      data,
    };
    
    this.emit('event', event);
    this.telemetry.log(event);
  }

  isRunning(): boolean {
    return this.running;
  }

  getUptime(): number {
    return this.telemetry.getUptime();
  }

  private createRng(seed: number): () => number {
    const m = 0x80000000;
    const a = 1103515245;
    const c = 12345;
    let state = seed ? seed : Math.floor(Math.random() * (m - 1));

    return () => {
      state = (a * state + c) % m;
      return state / (m - 1);
    };
  }

  // Check invariants
  async checkInvariants(): Promise<InvariantViolation[]> {
    if (!this.invariantChecker) {
      return [];
    }
    
    const metrics = this.getMetrics();
    const state = this.getState();
    
    this.violations = await this.invariantChecker.checkAll(metrics, state);
    
    // Emit violations
    if (this.violations.length > 0) {
      this.violations.forEach(violation => {
        this.emitEvent('invariant_violation', violation);
      });
    }
    
    return this.violations;
  }

  // Get current violations
  getViolations(): InvariantViolation[] {
    return this.violations;
  }

  // Get run information
  getRunInfo(): SimRunInfo {
    return {
      runId: this.currentRunId,
      seed: this.currentSeed,
      scenario: this.currentScenario || null,
      startedAt: this.startedAt?.toISOString(),
      finishedAt: this.finishedAt?.toISOString(),
    };
  }
}

// Singleton instance
let orchestratorInstance: SimOrchestrator | null = null;

export function getOrchestrator(baseURL?: string): SimOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SimOrchestrator(baseURL);
  }
  return orchestratorInstance;
}
