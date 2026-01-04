import { describe, expect, it } from "vitest";
import { buildAuditTimeline } from "@/audit/timeline";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { buildRiskTrajectory, evaluateThresholds, analyzeInterventionCounterfactual, TrustSafetyThreshold } from "@/trust/reinforcement";

const registry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: { domain: "booking", version: "ts-v1", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
      evolution: { allowBreakingChanges: false, requireMigrationPlan: true },
    },
    {
      domain: "dispute",
      contract: { domain: "dispute", version: "ts-v1", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
      evolution: { allowBreakingChanges: false, requireMigrationPlan: true },
      deprecation: { domain: "dispute", willDeprecate: true },
    },
    {
      domain: "anomaly",
      contract: { domain: "anomaly", version: "ts-v1", stability: "experimental", allowedMutations: [], forbiddenMutations: [] },
    },
  ],
};

function envelope(id: string, timestamp: number, logical: number, type: AnalyticsEnvelope["event"]["type"], metadata?: Record<string, unknown>): AnalyticsEnvelope {
  return {
    id,
    version: "v1",
    timestamp,
    timebase: { logical },
    source: "core",
    event: { type, payload: {} as any },
    metadata,
  };
}

describe("trust reinforcement reasoning", () => {
  const baseEnvelopes: AnalyticsEnvelope[] = [
    envelope("e1", 1000, 1, "booking.created", { trustSafety: { signals: ["positive_interaction"] } }),
    envelope("e2", 2000, 2, "booking.cancelled", {
      trustSafety: { signals: ["cancellation_spike"] },
      latencyP95Ms: 480,
    }),
    envelope("e3", 3000, 3, "anomaly.detected", { trustSafety: { signals: ["fraud_pattern", "abuse_report"] }, severity: "high" }),
  ];

  it("builds risk trajectories that evolve across frames", () => {
    const timeline = buildAuditTimeline({ envelopes: baseEnvelopes, registry });
    const trajectory = buildRiskTrajectory(timeline, "t0");

    expect(trajectory.snapshots).toHaveLength(3);
    const noShowRisk = trajectory.snapshots.map((snapshot) => snapshot.metrics.find((metric) => metric.dimension === "noShowHazard")?.value ?? 0);
    expect(noShowRisk[1]).toBeGreaterThan(noShowRisk[0]); // cancellation should escalate no-show hazard
    const reliability = trajectory.snapshots.map((snapshot) => snapshot.metrics.find((metric) => metric.dimension === "providerReliability")?.value ?? 0);
    expect(reliability[2]).toBeLessThan(reliability[0]); // anomaly degrades reliability confidence
    expect(Object.isFrozen(trajectory.snapshots[0])).toBe(true); // replay compatibility via deepFreeze
  });

  it("detects threshold crossings while enforcing governance and contract alignment", () => {
    const timeline = buildAuditTimeline({ envelopes: baseEnvelopes, registry });
    const trajectory = buildRiskTrajectory(timeline, "t1");

    const thresholds: TrustSafetyThreshold[] = [
      {
        id: "cancellation-guard",
        domain: "booking",
        dimension: "noShowHazard",
        comparator: "gte",
        value: 0.2,
        contractVersion: "ts-v1",
        label: "Cancellation escalation threshold",
        interventionClass: "notify",
      },
      {
        id: "legacy-anomaly-block",
        domain: "anomaly",
        dimension: "fraudLikelihood",
        comparator: "gte",
        value: 0.25,
        contractVersion: "legacy-v0",
        label: "Legacy anomaly hold",
        interventionClass: "pause",
        deprecated: true,
      },
    ];

    const { crossings, justifications } = evaluateThresholds(trajectory, thresholds, registry);
    const justified = justifications.find((item) => item.threshold.id === "cancellation-guard");
    expect(justified?.decision).toBe("justified");
    expect(justified?.whyNow).toContain("0.2");

    const blocked = justifications.find((item) => item.threshold.id === "legacy-anomaly-block");
    expect(blocked?.decision).toBe("blocked");
    expect(blocked?.assumptions.some((assumption) => assumption.toLowerCase().includes("contract version"))).toBe(true);
    expect(blocked?.assumptions.some((assumption) => assumption.toLowerCase().includes("deprecated"))).toBe(true);
    expect(crossings.length).toBeGreaterThan(0);
  });

  it("produces counterfactual deltas between baseline and variant timelines", () => {
    const baselineTimeline = buildAuditTimeline({ envelopes: baseEnvelopes, registry });
    const baselineTrajectory = buildRiskTrajectory(baselineTimeline, "baseline");

    const variantEnvelopes = [
      ...baseEnvelopes,
      envelope("e4", 4000, 4, "booking.cancelled", { trustSafety: { signals: ["cancellation_spike"] } }),
      envelope("e5", 5000, 5, "anomaly.detected", { trustSafety: { signals: ["abuse_pattern"] }, latencyP95Ms: 900 }),
    ];
    const variantTimeline = buildAuditTimeline({ envelopes: variantEnvelopes, registry });
    const variantTrajectory = buildRiskTrajectory(variantTimeline, "variant");

    const counterfactual = analyzeInterventionCounterfactual(
      { timeline: baselineTimeline, trajectory: baselineTrajectory, label: "no-intervention" },
      { timeline: variantTimeline, trajectory: variantTrajectory, label: "hypothetical-intervention" },
    );

    expect(counterfactual.delta.risk).toBeGreaterThan(0); // variant risk should be higher with extra cancellations/anomaly
    expect(counterfactual.replayCompatible).toBe(true);
    expect(counterfactual.signals).toContain("RISK_WORSE");
  });
});
