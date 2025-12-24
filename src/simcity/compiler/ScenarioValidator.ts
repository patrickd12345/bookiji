// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { DomainRegistry, DomainRegistryEntry } from "@/governance/DomainRegistry";
import { DeprecationPolicy } from "@/governance/DeprecationPolicy";
import {
  PerturbationType,
  ScenarioPerturbation,
  SimCityActorModel,
  SimCityScenarioV2,
} from "../v2/types";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export const ALLOWED_PERTURBATIONS: Record<
  PerturbationType,
  { domain: string; description: string; min: number; max: number }
> = {
  demandSpike: { domain: "booking", description: "Increase synthetic demand pressure", min: 0.1, max: 3 },
  providerDrop: { domain: "provider", description: "Reduce provider availability", min: -0.9, max: -0.05 },
  cancellationBias: { domain: "booking", description: "Bias toward cancellations and no-shows", min: 0.05, max: 0.9 },
  latencyInflation: { domain: "ops", description: "Increase system latency", min: 10, max: 2000 },
  trustSignal: { domain: "trust_safety", description: "Emit trust & safety synthetic flags", min: 0.1, max: 1 },
};

function validateDomain(domain: string, registry: DomainRegistry): string | undefined {
  const entry = registry.entries.find((candidate) => candidate.domain === domain);
  if (!entry) return `Domain "${domain}" is not registered in governance.`;
  if (entry.deprecation?.willDeprecate) {
    const policy: DeprecationPolicy = entry.deprecation;
    return `Domain "${domain}" is deprecated${policy.sunsetDate ? ` (sunsets ${policy.sunsetDate})` : ""}.`;
  }
  return undefined;
}

export function validatePerturbations(
  perturbations: readonly ScenarioPerturbation[],
  registry: DomainRegistry
): ValidationResult {
  const errors: string[] = [];
  perturbations.forEach((perturbation) => {
    if (!ALLOWED_PERTURBATIONS[perturbation.type]) {
      errors.push(`Perturbation "${perturbation.type}" is not allowed`);
      return;
    }
    const range = ALLOWED_PERTURBATIONS[perturbation.type];
    if (perturbation.domain !== range.domain) {
      errors.push(`Perturbation "${perturbation.type}" must target domain "${range.domain}"`);
    }
    if (perturbation.magnitude < range.min || perturbation.magnitude > range.max) {
      errors.push(
        `Perturbation "${perturbation.type}" magnitude ${perturbation.magnitude} is outside allowed range ${range.min}-${range.max}`
      );
    }
    const domainError = validateDomain(perturbation.domain, registry);
    if (domainError) {
      errors.push(domainError);
    }
  });

  return { valid: errors.length === 0, errors };
}

export function validateActors(actors: readonly SimCityActorModel[], registry: DomainRegistry): ValidationResult {
  const errors: string[] = [];
  actors.forEach((actor) => {
    const domainError = validateDomain(actor.domain, registry);
    if (domainError) errors.push(domainError);
  });
  return { valid: errors.length === 0, errors };
}

export function validateScenario(sc: SimCityScenarioV2, registry: DomainRegistry): ValidationResult {
  const errors: string[] = [];

  if (!sc.baselineEnvelopes) {
    errors.push("Scenario must include baseline envelopes (can be empty array)");
  }

  const actorResult = validateActors(sc.actors, registry);
  errors.push(...actorResult.errors);

  const perturbationResult = validatePerturbations(sc.perturbations ?? [], registry);
  errors.push(...perturbationResult.errors);

  if (sc.assumptions.length === 0) {
    errors.push("Scenario must declare assumptions");
  }

  if (typeof sc.seed !== "number") {
    errors.push("Scenario must include deterministic seed");
  }

  return { valid: errors.length === 0, errors };
}
