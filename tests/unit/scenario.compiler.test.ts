import { describe, expect, it } from "vitest";
import { compileScenario } from "@/simcity/compiler";
import { DomainRegistry } from "@/governance/DomainRegistry";

const registry: DomainRegistry = {
  entries: [
    {
      domain: "booking",
      contract: { domain: "booking", version: "1.0.0", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
    },
    {
      domain: "provider",
      contract: { domain: "provider", version: "1.0.0", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
    },
    {
      domain: "ops",
      contract: { domain: "ops", version: "1.0.0", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
    },
    {
      domain: "trust_safety",
      contract: { domain: "trust_safety", version: "1.0.0", stability: "experimental", allowedMutations: [], forbiddenMutations: [] },
    },
  ],
};

describe("Scenario Compiler", () => {
  it("compiles a valid prompt into a deterministic SimCityScenarioV2", () => {
    const prompt = {
      description: "Demand spike with provider outage and trust concern",
      intent: "stress" as const,
      constraints: ["No production coupling"],
    };

    const scenario = compileScenario(prompt, { seed: 123, registry });
    expect(scenario.id).toContain("sc-demand-spike");
    expect(scenario.perturbations?.length).toBeGreaterThan(0);
    expect(scenario.perturbations?.map((p) => p.type)).toContain("demandSpike");
    expect(scenario.perturbations?.map((p) => p.type)).toContain("providerDrop");
    expect(scenario.seed).toBe(123);
    expect(scenario.provenance?.source).toBe("scenario-compiler");
    expect(scenario.assumptions.length).toBeGreaterThan(0);
  });

  it("is deterministic for the same seed and input", () => {
    const prompt = { description: "Latency and queue issues", intent: "postmortem" as const };
    const runA = compileScenario(prompt, { seed: 999, registry });
    const runB = compileScenario(prompt, { seed: 999, registry });
    expect(runA).toEqual(runB);
  });

  it("rejects unexpressible scenarios", () => {
    const prompt = { description: "Quantum teleportation of bookings" };
    expect(() => compileScenario(prompt, { seed: 5, registry })).toThrow(/No expressible perturbations/i);
  });

  it("fails validation when governance registry lacks required domains", () => {
    const prompt = { description: "Provider outage" };
    const minimalRegistry: DomainRegistry = {
      entries: [
        {
          domain: "booking",
          contract: { domain: "booking", version: "1.0.0", stability: "stable", allowedMutations: [], forbiddenMutations: [] },
        },
      ],
    };
    expect(() => compileScenario(prompt, { seed: 7, registry: minimalRegistry })).toThrow(/not registered/i);
  });
});
