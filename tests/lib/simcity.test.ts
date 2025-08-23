import { describe, it, expect, beforeEach } from 'vitest';
import { SimTelemetry } from '@/lib/simcity/telemetry';
import { createAgent, generatePersona } from '@/lib/simcity/agent';
import { getOrchestrator } from '@/lib/simcity/orchestrator';
import { DEFAULT_POLICIES, DEFAULT_METRICS } from '@/lib/simcity/types';

describe('SimCity Testing Engine', () => {
  describe('Telemetry', () => {
    let telemetry: SimTelemetry;

    beforeEach(() => {
      telemetry = new SimTelemetry();
    });

    it('should initialize with default metrics', () => {
      const metrics = telemetry.snapshot();
      expect(metrics.bookingsCreated).toBe(0);
      expect(metrics.totalAgentsSpawned).toBe(0);
      expect(metrics.activeAgents).toBe(0);
    });

    it('should start and track uptime', async () => {
      telemetry.start();
      // Small delay to ensure uptime is tracked
      await new Promise(resolve => setTimeout(resolve, 10));
      const uptime = telemetry.getUptime();
      expect(uptime).toBeGreaterThan(0);
    });

    it('should log events and update metrics', () => {
      telemetry.start();
      
      telemetry.log({
        type: 'agent_spawn',
        timestamp: new Date().toISOString(),
        data: { id: 1, kind: 'customer' }
      });

      const metrics = telemetry.snapshot();
      expect(metrics.totalAgentsSpawned).toBe(1);
      expect(metrics.activeAgents).toBe(1);
    });
  });

  describe('Agent System', () => {
    it('should generate personas with valid properties', () => {
      const customerPersona = generatePersona('customer', 1);
      const vendorPersona = generatePersona('vendor', 2);

      expect(customerPersona.email).toContain('synthetic+customer-1@example.com');
      expect(vendorPersona.email).toContain('synthetic+vendor-2@example.com');
      expect(typeof customerPersona.chatty).toBe('boolean');
      expect(typeof customerPersona.patient).toBe('boolean');
      expect(typeof customerPersona.strict).toBe('boolean');
    });

    it('should create agents of correct types', () => {
      const customerPersona = generatePersona('customer', 1);
      const vendorPersona = generatePersona('vendor', 2);

      const customerAgent = createAgent('customer', customerPersona);
      const vendorAgent = createAgent('vendor', vendorPersona);

      expect(customerAgent).toBeDefined();
      expect(vendorAgent).toBeDefined();
    });
  });

  describe('Orchestrator', () => {
    it('should initialize with default state', () => {
      const orchestrator = getOrchestrator();
      const state = orchestrator.getState();

      expect(state.running).toBe(false);
      expect(state.tick).toBe(0);
      expect(state.liveAgents).toBe(0);
      expect(state.policies).toEqual(DEFAULT_POLICIES);
    });

    it('should start and stop simulation', async () => {
      const orchestrator = getOrchestrator();
      
      expect(orchestrator.isRunning()).toBe(false);
      
      await orchestrator.start();
      expect(orchestrator.isRunning()).toBe(true);
      
      await orchestrator.stop();
      expect(orchestrator.isRunning()).toBe(false);
    });

    it('should update policies', () => {
      const orchestrator = getOrchestrator();
      
      orchestrator.setPolicies({ 
        rescheduleChance: 0.5,
        cancelChance: 0.25 
      });
      
      const state = orchestrator.getState();
      expect(state.policies.rescheduleChance).toBe(0.5);
      expect(state.policies.cancelChance).toBe(0.25);
    });
  });

  describe('Default Policies', () => {
    it('should have reasonable default values', () => {
      expect(DEFAULT_POLICIES.skinFee).toBe(1.00);
      expect(DEFAULT_POLICIES.maxConcurrentAgents).toBe(50);
      expect(DEFAULT_POLICIES.tickSpeedMs).toBe(3000);
      expect(DEFAULT_POLICIES.minutesPerTick).toBe(10);
      expect(DEFAULT_POLICIES.rescheduleChance).toBe(0.35);
      expect(DEFAULT_POLICIES.cancelChance).toBe(0.15);
    });
  });

  describe('Default Metrics', () => {
    it('should have zero-initialized metrics', () => {
      expect(DEFAULT_METRICS.bookingsCreated).toBe(0);
      expect(DEFAULT_METRICS.reschedules).toBe(0);
      expect(DEFAULT_METRICS.cancels).toBe(0);
      expect(DEFAULT_METRICS.activeAgents).toBe(0);
      expect(DEFAULT_METRICS.totalAgentsSpawned).toBe(0);
    });
  });
});
