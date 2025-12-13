import { describe, expect, it } from "vitest";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { runOpsAIV2 } from "@/opsai/v2";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { GovernanceContract } from "@/governance/GovernanceContract";
import { EvolutionFlags } from "@/governance/EvolutionFlags";

const bookingContract: GovernanceContract = {
  domain: "booking",
  version: "2.0.0",
  stability: "stable",
  allowedMutations: ["extend-contract"],
  forbiddenMutations: ["drop-field"],
};

const registry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: bookingContract,
      evolution: { allowBreakingChanges: false, requireMigrationPlan: true } satisfies EvolutionFlags,
    },
  ],
};

const makeEnvelope = (overrides?: Partial<AnalyticsEnvelope>): AnalyticsEnvelope => ({
  id: "evt-booking-1",
  version: "v1",
  timestamp: 1_700_000_000_000,
  timebase: { logical: 10, simTime: 99 },
  source: "core",
  event: {
    type: "booking.created",
    payload: { bookingId: "bk-1", providerId: "prov-1" },
  },
  metadata: {
    latencyP95Ms: 420,
    sloStatus: "violated",
    activeBookings: 35,
    capacity: 50,
    simcity: { runId: "run-7", scenarioId: "stress-1", simTime: 99 },
  },
  ...overrides,
});

describe("OpsAI v2 reasoning", () => {
  it("produces deterministic artifacts from analytics envelopes", () => {
    const envelope = makeEnvelope();
    const resultA = runOpsAIV2(envelope, registry, { enabled: true });
    const resultB = runOpsAIV2(envelope, registry, { enabled: true });

    expect(resultA.mode).toBe("v2");
    expect(resultA.artifacts.map((a) => a.kind)).toEqual(["insight", "prediction", "counterfactual", "explanation"]);
    expect(resultA.artifacts).toEqual(resultB.artifacts);

    const prediction = resultA.artifacts.find((a) => a.kind === "prediction");
    expect(prediction && prediction.governance.evolution?.requireMigrationPlan).toBe(true);
    expect((prediction as any)?.metrics?.sloBreachProbability).toBeGreaterThan(0.2);
  });

  it("refuses reasoning for unregistered domains and emits governance explanation only", () => {
    const envelope = makeEnvelope({
      event: { type: "dispute.opened", payload: { disputeId: "d1", bookingId: "bk-1", reason: "refund", openedBy: "user-1" } } as any,
    });

    const result = runOpsAIV2(envelope, registry, { enabled: true });
    expect(result.mode).toBe("governance-blocked");
    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0].kind).toBe("explanation");
    expect(result.artifacts[0].governance.permitted).toBe(false);
  });

  it("falls back to OpsAI v1 adapter when disabled", () => {
    const envelope = makeEnvelope();
    const result = runOpsAIV2(envelope, registry, { enabled: false });

    expect(result.mode).toBe("v1-fallback");
    expect(result.fallback?.version).toBe("opsai/v1");
    expect(result.artifacts).toHaveLength(0);
  });
});
