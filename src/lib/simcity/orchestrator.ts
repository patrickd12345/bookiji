import { EventEmitter } from 'events';
import { SimTelemetry } from './telemetry';
import { SimState, SimPolicies, SimEvent, SimMetrics, DEFAULT_POLICIES, DEFAULT_METRICS } from './types';

export class SimOrchestrator extends EventEmitter {
  private state: SimState;
  private running: boolean = false;
  private tickInterval: NodeJS.Timeout | null = null;
  private telemetry: SimTelemetry;
  private agentCounter: number = 0;

  constructor(baseURL: string = 'http://localhost:3000') {
    super();
    this.telemetry = new SimTelemetry();
    this.state = {
      running: false,
      tick: 0,
      nowISO: new Date().toISOString(),
      liveAgents: 0,
      metrics: { ...DEFAULT_METRICS },
      policies: { ...DEFAULT_POLICIES }
    };
  }

  async start(): Promise<void> {
    if (this.running) {
      throw new Error('Simulation is already running');
    }

    this.running = true;
    this.state.running = true;
    this.state.startTime = new Date();
    this.state.tick = 0;
    this.state.nowISO = new Date().toISOString();
    
    this.telemetry.start();
    this.emitEvent('start', { startTime: this.state.startTime });
    
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
    
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
    
    this.emitEvent('stop', { stopTime: new Date() });
  }

  private async tick(): Promise<void> {
    this.state.tick++;
    this.state.nowISO = this.advanceSimulatedTime();
    this.state.lastTickTime = new Date();
    
    this.emitEvent('tick', { 
      tick: this.state.tick, 
      simulatedTime: this.state.nowISO,
      liveAgents: this.state.liveAgents 
    });

    // Spawn new agents based on policies
    await this.spawnAgents();
    
    // Update metrics
    this.state.metrics = this.telemetry.snapshot();
    this.state.liveAgents = this.state.metrics.activeAgents;
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
    if (Math.random() < this.state.policies.customerSpawnRate) {
      await this.spawnAgent('customer');
    }

    // Spawn vendors only during business hours
    if (isVendorHours && Math.random() < this.state.policies.vendorSpawnRate) {
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
        duration: Date.now() - (this.state.lastTickTime?.getTime() || Date.now()),
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
    return { ...this.state };
  }

  getMetrics() {
    return this.telemetry.snapshot();
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
    this.emitEvent('reset', { timestamp: new Date().toISOString() });
  }

  private emitEvent(type: SimEvent['type'], data: any): void {
    const event: SimEvent = {
      type,
      timestamp: new Date().toISOString(),
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
}

// Singleton instance
let orchestratorInstance: SimOrchestrator | null = null;

export function getOrchestrator(baseURL?: string): SimOrchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new SimOrchestrator(baseURL);
  }
  return orchestratorInstance;
}

