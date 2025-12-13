import { describe, expect, it } from "vitest";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { runOpsAIV2 } from "@/opsai/v2/reasoner";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { createScenarioFromHistory, forkTimeline, runMarketSimulation } from "@/simcity/v2";

const governanceRegistry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: {
        domain: "booking",
        version: "1.0.0",
        stability: "stable",
        allowedMutations: [],
        forbiddenMutations: [],
      },
      evolution: { allowBreakingChanges: false, requireMigrationPlan: true },
    },
    {
      domain: "provider",
      contract: {
        domain: "provider",
        version: "1.0.0",
        stability: "stable",
        allowedMutations: [],
        forbiddenMutations: [],
      },
      evolution: { allowBreakingChanges: false, requireMigrationPlan: true },
    },
    {
      domain: "ops",
      contract: {
        domain: "ops",
        version: "1.0.0",
        stability: "stable",
        allowedMutations: [],
        forbiddenMutations: [],
      },
      evolution: { allowBreakingChanges: true, requireMigrationPlan: false },
    },
  ],
};

function makeHistoricalEnvelopes(): AnalyticsEnvelope[] {
  const baseTimestamp = 1_700_000_000_000;
  return [
    {
      id: "hist-1",
      version: "v1",
      timestamp: baseTimestamp,
      timebase: { logical: 0 },
      source: "core",
      event: { type: "booking.created", payload: { bookingId: "b1", providerId: "p1" } },
      metadata: { latencyP95Ms: 220 },
    },
    {
      id: "hist-2",
      version: "v1",
      timestamp: baseTimestamp + 60_000,
      timebase: { logical: 1 },
      source: "core",
      event: { type: "booking.cancelled", payload: { bookingId: "b1", providerId: "p1", reason: "user_cancel" } },
      metadata: { latencyP95Ms: 280 },
    },
    {
      id: "hist-3",
      version: "v1",
      timestamp: baseTimestamp + 120_000,
      timebase: { logical: 2 },
      source: "core",
      event: { type: "provider.updated", payload: { providerId: "p1", fields: ["availability"], updatedAt: 2 } },
      metadata: { latencyP95Ms: 260 },
    },
  ];
}

describe("SimCity v2 deterministic simulation", () => {
  const baselineHistory = makeHistoricalEnvelopes();
  const scenario = createScenarioFromHistory({
    id: "baseline",
    label: "Baseline Scenario",
    seed: 7,
    baselineEnvelopes: baselineHistory,
  });

  it("replays deterministically with the same seed", () => {
    const runA = runMarketSimulation({
      scenario,
      registry: governanceRegistry,
      seed: 99,
      horizon: 4,
    });

    const runB = runMarketSimulation({
      scenario,
      registry: governanceRegistry,
      seed: 99,
      horizon: 4,
    });

    expect(runA.envelopes).toEqual(runB.envelopes);
    expect(runA.states).toEqual(runB.states);
  });

  it("diverges with a different seed", () => {
    const runA = runMarketSimulation({
      scenario,
      registry: governanceRegistry,
      seed: 101,
      horizon: 4,
    });

    const runB = runMarketSimulation({
      scenario,
      registry: governanceRegistry,
      seed: 202,
      horizon: 4,
    });

    expect(runA.envelopes[0].id).not.toEqual(runB.envelopes[0].id);
    expect(runA.states).not.toEqual(runB.states);
  });
});

describe("SimCity v2 governance and OpsAI interop", () => {
  const baselineHistory = makeHistoricalEnvelopes();
  const scenario = createScenarioFromHistory({
    id: "interop",
    label: "Interop Scenario",
    seed: 11,
    baselineEnvelopes: baselineHistory,
  });

  it("rejects deprecated domains at load time", () => {
    const rejectingRegistry: DomainRegistry = {
      entries: [
        {
          domain: "booking",
          contract: {
            domain: "booking",
            version: "0.9.0",
            stability: "deprecated",
            allowedMutations: [],
            forbiddenMutations: [],
          },
          deprecation: { domain: "booking", willDeprecate: true, sunsetDate: "2026-01-01" },
        },
      ],
    };

    expect(() =>
      runMarketSimulation({
        scenario,
        registry: rejectingRegistry,
        seed: 5,
        horizon: 3,
      })
    ).toThrow(/deprecated/i);
  });

  it("emits synthetic envelopes compatible with OpsAI v2", () => {
    const run = runMarketSimulation({
      scenario,
      registry: governanceRegistry,
      seed: 13,
      horizon: 3,
    });

    const envelope = run.envelopes[0];
    const result = runOpsAIV2(envelope, governanceRegistry, { enabled: true });

    expect(envelope.metadata.simcity.synthetic).toBe(true);
    expect(result.mode).not.toBe("governance-blocked");
    expect(result.artifacts.length).toBeGreaterThan(0);
  });
});

describe("SimCity v2 counterfactual forking", () => {
  const baselineHistory = makeHistoricalEnvelopes();
  const scenario = createScenarioFromHistory({
    id: "forkable",
    label: "Fork Scenario",
    seed: 23,
    baselineEnvelopes: baselineHistory,
  });

  it("compares baseline against forked timeline with demand spike", () => {
    const result = forkTimeline({
      scenario,
      registry: governanceRegistry,
      seed: 33,
      horizon: 5,
      change: { kind: "demand", magnitude: 1 },
    });

    expect(result.delta.bookings).toBeGreaterThan(0);
    expect(result.variant.runId).toContain("fork");
    expect(result.baseline.runId).not.toEqual(result.variant.runId);
  });
});
