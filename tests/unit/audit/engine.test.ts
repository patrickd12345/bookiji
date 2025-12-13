import { describe, expect, it } from "vitest";
import { buildAuditTimeline } from "@/audit/timeline";
import { createReplayCursor, jumpToEvent, jumpToTime, replayDeterministically, replayNext } from "@/audit/replay";
import { diffTimelines } from "@/audit/diff";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { DomainRegistry } from "@/governance/DomainRegistry";

const baseTimestamp = 1_700_000_000_000;

const registry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: { domain: "booking", version: "1.0.0", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
      evolution: { allowBreakingChanges: false, requireMigrationPlan: true },
    },
    {
      domain: "provider",
      contract: { domain: "provider", version: "1.0.0", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
      evolution: { allowBreakingChanges: false, requireMigrationPlan: false },
    },
  ],
};

const deprecatedRegistry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: { domain: "booking", version: "0.9.0", stability: "deprecated", allowedMutations: [], forbiddenMutations: [] },
      deprecation: { domain: "booking", willDeprecate: true, sunsetDate: "2024-01-01" },
    },
  ],
};

function baselineEnvelopes(): AnalyticsEnvelope[] {
  return [
    {
      id: "real-1",
      version: "v1",
      timestamp: baseTimestamp,
      timebase: { logical: 0 },
      source: "core",
      event: { type: "booking.created", payload: { bookingId: "b-1", providerId: "p-1" } },
      metadata: { latencyP95Ms: 180 },
    },
    {
      id: "sim-1",
      version: "v1",
      timestamp: baseTimestamp + 50,
      timebase: { logical: 1, simTime: 10 },
      source: "simcity",
      event: { type: "booking.cancelled", payload: { bookingId: "b-1", providerId: "p-1", reason: "user" } },
      metadata: {
        simcity: {
          synthetic: true,
          runId: "run-baseline",
          scenarioId: "scenario-1",
          simTime: 10,
          logicalTime: 1,
          baseline: true,
          trustSafety: { simulated: true, signals: ["fraud-risk"] },
        },
        evolution: { allowBreakingChanges: false, requireMigrationPlan: true },
      },
    },
    {
      id: "real-2",
      version: "v1",
      timestamp: baseTimestamp + 100,
      timebase: { logical: 2 },
      source: "core",
      event: { type: "provider.updated", payload: { providerId: "p-1", fields: ["status"], updatedAt: 2 } },
      metadata: { latencyP95Ms: 190 },
    },
  ];
}

function forkedEnvelopes(): AnalyticsEnvelope[] {
  const base = baselineEnvelopes();
  return [
    ...base,
    {
      id: "fork-extra",
      version: "v1",
      timestamp: baseTimestamp + 150,
      timebase: { logical: 3, simTime: 20 },
      source: "simcity",
      event: { type: "booking.cancelled", payload: { bookingId: "b-2", providerId: "p-2", reason: "simulated" } },
      metadata: {
        simcity: {
          synthetic: true,
          runId: "run-fork",
          scenarioId: "scenario-1",
          forkOf: "run-baseline",
          simTime: 20,
          logicalTime: 3,
          baseline: false,
          trustSafety: { simulated: true, signals: ["fraud-risk", "slo-risk"] },
        },
        evolution: { allowBreakingChanges: true, requireMigrationPlan: true, versionUpgradeRequired: "2.0.0" },
        latencyP95Ms: 240,
      },
    },
  ];
}

describe("Audit replay engine", () => {
  it("replays deterministically and supports jump operations", () => {
    const timeline = buildAuditTimeline({ id: "baseline", envelopes: baselineEnvelopes(), registry });

    const start = createReplayCursor(timeline);
    const first = replayNext(timeline, start);
    const second = replayNext(timeline, first.cursor);
    const jumped = replayNext(timeline, jumpToTime(timeline, baseTimestamp + 50));
    const byEvent = replayNext(timeline, jumpToEvent(timeline, "sim-1"));

    expect(first.frame?.id).toBe("real-1");
    expect(second.state.eventCounts["booking.created"]).toBe(1);
    expect(second.state.syntheticSeen).toBe(1);
    expect(jumped.frame?.id).toBe("sim-1");
    expect(byEvent.frame?.governance.domain).toBe("booking");
  });

  it("produces stable state across runs", () => {
    const timeline = buildAuditTimeline({ id: "baseline", envelopes: baselineEnvelopes(), registry });
    const firstRun = replayDeterministically(timeline);
    const secondRun = replayDeterministically(timeline);

    expect(firstRun).toEqual(secondRun);
    expect(firstRun.realSeen).toBe(2);
    expect(firstRun.syntheticSeen).toBe(1);
    expect(firstRun.eventCounts["provider.updated"]).toBe(1);
  });
});

describe("Audit diff engine", () => {
  it("surfaces divergence and synthetic fork explanations", () => {
    const baselineTimeline = buildAuditTimeline({ id: "baseline", envelopes: baselineEnvelopes(), registry });
    const forkTimeline = buildAuditTimeline({ id: "fork", envelopes: forkedEnvelopes(), registry });

    const diff = diffTimelines(baselineTimeline, forkTimeline);

    expect(diff.metricDivergence["booking.cancelled"]).toBe(1);
    expect(diff.trustSafetyChanges.some((change) => change.includes("slo-risk"))).toBe(true);
    expect(diff.explanations.some((exp) => exp.syntheticContext?.forkOf === "run-baseline")).toBe(true);
    expect(diff.sloImpacts.latencyP95Delta).toBeGreaterThan(0);
  });
});

describe("Governance enforcement", () => {
  it("blocks deprecation cutoff violations", () => {
    const envelope: AnalyticsEnvelope = {
      id: "deprecated-1",
      version: "v1",
      timestamp: Date.parse("2025-02-01"),
      timebase: { logical: 0 },
      source: "core",
      event: { type: "booking.created", payload: { bookingId: "b-dep", providerId: "p-dep" } },
    };

    expect(() => buildAuditTimeline({ envelopes: [envelope], registry: deprecatedRegistry })).toThrow(/cutoff/i);
  });

  it("keeps synthetic provenance separate from real streams", () => {
    const timeline = buildAuditTimeline({ id: "mixed", envelopes: baselineEnvelopes(), registry });
    const syntheticFrame = timeline.frames.find((frame) => frame.provenance === "synthetic");

    expect(timeline.sources.synthetic).toBe(1);
    expect(timeline.sources.real).toBe(2);
    expect(syntheticFrame?.trustSafety?.signals).toContain("fraud-risk");
    expect(syntheticFrame?.governance.permitted).toBe(true);
  });
});
