import { describe, expect, it } from "vitest";
import { IntakeSession } from "@/simcity/intake/IntakeSession";
import { ClarificationEngine } from "@/simcity/intake/ClarificationEngine";
import { ProposalBuilder } from "@/simcity/intake/ProposalBuilder";

describe("ClarificationEngine", () => {
  it("flags ambiguities and produces clarification questions", () => {
    const session = new IntakeSession("s1", "demand spike");
    const engine = new ClarificationEngine();
    const questions = engine.evaluate(session);
    expect(questions.length).toBeGreaterThan(0);
    expect(questions.map((q) => q.category)).toContain("duration");
    session.setClarifyingQuestions(questions);
    expect(session.getOutstandingQuestions().length).toBe(questions.length);
  });
});

describe("ProposalBuilder", () => {
  it("does not build proposals when clarifications are outstanding", () => {
    const builder = new ProposalBuilder();
    const proposals = builder.build("demand spike", {}, [{ id: "duration-0", text: "?", category: "duration" }]);
    expect(proposals).toEqual([]);
  });

  it("builds multiple ready proposals when fully specified", () => {
    const builder = new ProposalBuilder();
    const proposals = builder.build("demand spike with provider outage", {
      "duration-0": "PT2H",
      "scope-0": "global",
      "severity-0": "major",
    });
    expect(proposals.length).toBeGreaterThanOrEqual(2);
    expect(proposals.every((p) => p.status === "ready" || p.status === "unexpressible")).toBe(true);
    const ready = proposals.filter((p) => p.status === "ready");
    expect(ready[0].stressVectors.length).toBeGreaterThan(0);
    expect(ready[0].assumptions.length).toBeGreaterThan(0);
  });

});
