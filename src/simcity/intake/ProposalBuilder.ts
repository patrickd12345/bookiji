import { ScenarioProposal, StressVector } from "./ScenarioProposal";
import { ALLOWED_PERTURBATIONS } from "../compiler/ScenarioValidator";
import { PerturbationType } from "../v2/types";
import { IntakeQuestion } from "./IntakeSession";

const DEFAULT_DURATION = "PT3H";

function pickStressVectors(rawInput: string): StressVector[] {
  const text = rawInput.toLowerCase();
  const vectors: StressVector[] = [];

  const append = (type: PerturbationType) => {
    if (!vectors.includes(type)) vectors.push(type);
  };

  if (/(demand|spike|traffic)/.test(text)) append("demandSpike");
  if (/(provider|supply|outage|availability)/.test(text)) append("providerDrop");
  if (/(cancel|no[- ]?show|noshow)/.test(text)) append("cancellationBias");
  if (/(latency|slow|queue)/.test(text)) append("latencyInflation");
  if (/(fraud|trust|abuse|payment)/.test(text)) append("trustSignal");

  if (vectors.length === 0) {
    vectors.push("demandSpike");
  }

  return vectors;
}

function unique<T>(items: T[]): T[] {
  return Array.from(new Set(items));
}

export class ProposalBuilder {
  build(rawInput: string, answers: Record<string, string>, outstanding: IntakeQuestion[] = []): ScenarioProposal[] {
    if (outstanding.length > 0) return [];

    const stressVectors = pickStressVectors(rawInput);
    const scope = answers["scope-0"] || "global";
    const duration = answers["duration-0"] || DEFAULT_DURATION;
    const severity = answers["severity-0"] || "medium";
    const forkFrom = answers["forkFrom"] || undefined;
    const assumptions = unique([
      "Not executable; requires explicit approval.",
      "Pricing and ops remain frozen unless otherwise stated.",
      answers["assumptions-0"],
    ]).filter(Boolean) as string[];

    const baseDescription = rawInput.trim();
    const proposals: ScenarioProposal[] = [];

    const vectorGroups: StressVector[][] = [
      stressVectors,
      unique([...stressVectors, "latencyInflation"] as StressVector[]),
      unique([...stressVectors, "trustSignal"] as StressVector[]),
    ].slice(0, 3);

    vectorGroups.forEach((vectors, idx) => {
      const expressible = vectors.every((v) => Boolean(ALLOWED_PERTURBATIONS[v]));
      proposals.push({
        id: `proposal-${idx + 1}`,
        title: `Option ${idx + 1}: ${severity} ${scope} stress`,
        description: `${baseDescription} (${scope}, severity=${severity})`,
        stressVectors: vectors,
        assumptions,
        duration,
        forkFrom,
        confidence: expressible ? "medium" : "low",
        notes: expressible ? undefined : "Unexpressible with current system vocabulary",
        status: expressible ? "ready" : "unexpressible",
      });
    });

    return proposals;
  }
}
