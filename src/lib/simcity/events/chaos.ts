import { EventEmitter } from 'events';

export interface ChaosEvent {
  type: string;
  parameters: Record<string, any>;
  startTime: Date;
  endTime: Date;
  active: boolean;
}

export class ChaosInjector extends EventEmitter {
  private activeEvents: Map<string, ChaosEvent> = new Map();
  private eventTimers: Map<string, NodeJS.Timeout> = new Map();

  // Payment Chaos Events
  triggerPaymentGatewayOutage(parameters: { outageType: string; durationMin: number }): void {
    const eventId = `payment_outage_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'PAYMENT_GATEWAY_OUTAGE',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate Stripe API being down
    this.emit('chaos_event', {
      type: 'PAYMENT_GATEWAY_OUTAGE',
      event,
      message: `Stripe API outage simulated: ${parameters.outageType}`,
      timestamp: new Date().toISOString()
    });

    // Auto-clear after duration
    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  triggerPaymentTimeouts(parameters: { timeoutRate: number; durationMin: number }): void {
    const eventId = `payment_timeouts_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'PAYMENT_TIMEOUTS',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate payment timeouts
    this.emit('chaos_event', {
      type: 'PAYMENT_TIMEOUTS',
      event,
      message: `Payment timeouts simulated: ${parameters.timeoutRate * 100}% rate`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Auth Chaos Events
  triggerJWTExpiry(parameters: { burstPct: number; durationMin: number }): void {
    const eventId = `jwt_expiry_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'FORCE_JWT_EXPIRY',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate JWT expiry bursts
    this.emit('chaos_event', {
      type: 'FORCE_JWT_EXPIRY',
      event,
      message: `JWT expiry burst simulated: ${parameters.burstPct}% of tokens`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  triggerClockSkew(parameters: { skewSeconds: number; durationMin: number }): void {
    const eventId = `clock_skew_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'CLOCK_SKEW',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate clock skew
    this.emit('chaos_event', {
      type: 'CLOCK_SKEW',
      event,
      message: `Clock skew simulated: ±${parameters.skewSeconds}s`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Multi-Tenant Chaos Events
  triggerTenantMixer(parameters: { tenants: string[]; crossLoadPct: number; durationMin: number }): void {
    const eventId = `tenant_mixer_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'TENANT_MIXER',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate cross-tenant load mixing
    this.emit('chaos_event', {
      type: 'TENANT_MIXER',
      event,
      message: `Tenant mixing simulated: ${parameters.crossLoadPct}% cross-tenant load`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // DST & Calendar Chaos Events
  triggerDSTTransition(parameters: { region: string; durationMin: number }): void {
    const eventId = `dst_transition_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'SIMULATE_DST_TRANSITION',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate DST transition
    this.emit('chaos_event', {
      type: 'SIMULATE_DST_TRANSITION',
      event,
      message: `DST transition simulated: ${parameters.region}`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Abuse & DoS Chaos Events
  triggerPathologicalInputs(parameters: { maxPayloadKB: number; unicodeWeirdness: boolean; durationMin: number }): void {
    const eventId = `pathological_inputs_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'PATHOLOGICAL_INPUTS',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate pathological inputs
    this.emit('chaos_event', {
      type: 'PATHOLOGICAL_INPUTS',
      event,
      message: `Pathological inputs simulated: ${parameters.maxPayloadKB}KB payloads, unicode: ${parameters.unicodeWeirdness}`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  triggerIPBurst(parameters: { ipCount: number; rpsPerIp: number; target: string; durationMin: number }): void {
    const eventId = `ip_burst_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'IP_BURST',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate IP burst attack
    this.emit('chaos_event', {
      type: 'IP_BURST',
      event,
      message: `IP burst simulated: ${parameters.ipCount} IPs, ${parameters.rpsPerIp} RPS/IP to ${parameters.target}`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Webhook Chaos Events
  triggerWebhookStorm(parameters: { dupPct: number; burstMin: number; durationMin: number }): void {
    const eventId = `webhook_storm_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'WEBHOOK_STORM',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate webhook storm
    this.emit('chaos_event', {
      type: 'WEBHOOK_STORM',
      event,
      message: `Webhook storm simulated: ${parameters.dupPct}% duplicates, ${parameters.burstMin}min burst`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Deployment Chaos Events
  triggerBlueGreenSwitch(parameters: { canaryPct: number; durationMin: number }): void {
    const eventId = `blue_green_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'BLUE_GREEN_SWITCH',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate blue-green deployment
    this.emit('chaos_event', {
      type: 'BLUE_GREEN_SWITCH',
      event,
      message: `Blue-green switch simulated: ${parameters.canaryPct}% canary traffic`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Search & Index Chaos Events
  triggerFTSReindex(parameters: { durationMin: number }): void {
    const eventId = `fts_reindex_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'FTS_REINDEX',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate full-text search reindex
    this.emit('chaos_event', {
      type: 'FTS_REINDEX',
      event,
      message: `FTS reindex simulated: ${parameters.durationMin} minutes`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Storage Chaos Events
  triggerS3LatencySpikes(parameters: { p99Ms: number; durationMin: number }): void {
    const eventId = `s3_latency_${Date.now()}`;
    const startTime = new Date();
    const endTime = new Date(startTime.getTime() + parameters.durationMin * 60 * 1000);
    
    const event: ChaosEvent = {
      type: 'S3_LATENCY_SPIKES',
      parameters,
      startTime,
      endTime,
      active: true
    };

    this.activeEvents.set(eventId, event);
    
    // Simulate S3 latency spikes
    this.emit('chaos_event', {
      type: 'S3_LATENCY_SPIKES',
      event,
      message: `S3 latency spike simulated: P99 ${parameters.p99Ms}ms`,
      timestamp: new Date().toISOString()
    });

    const timer = setTimeout(() => {
      this.clearEvent(eventId);
    }, parameters.durationMin * 60 * 1000);

    this.eventTimers.set(eventId, timer);
  }

  // Utility methods
  private clearEvent(eventId: string): void {
    const event = this.activeEvents.get(eventId);
    if (event) {
      event.active = false;
      this.activeEvents.delete(eventId);
      
      this.emit('chaos_event_ended', {
        eventId,
        event,
        message: `Chaos event ended: ${event.type}`,
        timestamp: new Date().toISOString()
      });
    }

    const timer = this.eventTimers.get(eventId);
    if (timer) {
      clearTimeout(timer);
      this.eventTimers.delete(eventId);
    }
  }

  getActiveEvents(): ChaosEvent[] {
    return Array.from(this.activeEvents.values()).filter(e => e.active);
  }

  stopAllEvents(): void {
    this.activeEvents.forEach((event, eventId) => {
      this.clearEvent(eventId);
    });
  }

  isEventActive(type: string): boolean {
    return Array.from(this.activeEvents.values()).some(e => e.active && e.type === type);
  }
}
