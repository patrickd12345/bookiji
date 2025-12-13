import { describe, expect, it } from "vitest";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";
import { adaptAnalyticsEnvelopeToSimCity } from "@/simcity/contracts/SimCityEnvelopeAdapter";
import { ScenarioContract } from "@/simcity/contracts/ScenarioContract";

const scenario: ScenarioContract = {
  id: "scenario-1",
  label: "Simulated booking happy path",
  seedData: { region: "us-east", userCount: 4 },
  steps: [
    { id: "step-1", label: "boot", action: "initialize world", at: 0 },
    { id: "step-2", label: "inject failure", action: "network drop", at: 1500, syntheticEventType: "simcity.inject.failure" },
  ],
};

const baseEnvelope: AnalyticsEnvelope = {
  id: "evt-sim-1",
  version: "v1",
  timestamp: 1_700_000_005_000,
  timebase: { logical: 21, simTime: 2500 },
  source: "simcity",
  event: { type: "simcity.scenario.started", payload: { scenarioId: scenario.id, runId: "run-1" } },
  metadata: { lane: "control" },
};

describe("SimCity contracts", () => {
  it("models scenarios with ordered steps and optional seeds", () => {
    expect(scenario.steps).toHaveLength(2);
    expect(scenario.seedData?.region).toBe("us-east");
    expect(scenario.steps[1].syntheticEventType).toBe("simcity.inject.failure");
  });

  it("adapts analytics envelopes with simulated timestamps and anomaly injections", () => {
    const anomalyInjection = { injector: "chaos-kit", code: "NET_DROP" };
    const adapted = adaptAnalyticsEnvelopeToSimCity(baseEnvelope, {
      scenario,
      simulatedTimestamp: 3000,
      anomalyInjection,
    });

    expect(adapted.logicalTime.logical).toBe(21);
    expect(adapted.simulatedTimestamp).toBe(3000);
    expect(adapted.scenario?.id).toBe(scenario.id);
    expect(adapted.anomalyInjection).toMatchObject(anomalyInjection);
    expect(adapted.synthetic).toBe(false);
  });

  it("supports synthetic event overrides for playback and time travel", () => {
    const syntheticEvent: StandardizedEvent = {
      type: "simcity.inject.failure",
      payload: { scenarioId: scenario.id, injector: "sim-engine", errorType: "timeout" },
    };

    const adapted = adaptAnalyticsEnvelopeToSimCity(baseEnvelope, {
      scenario,
      syntheticEvent,
    });

    expect(adapted.synthetic).toBe(true);
    expect(adapted.event).toEqual(syntheticEvent);
    expect(adapted.simulatedTimestamp).toBe(baseEnvelope.timebase.simTime);
  });
});
