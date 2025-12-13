import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { DomainRegistry } from "@/governance/DomainRegistry";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { SeededRng } from "../v2/rng";
import {
  ScenarioPerturbation,
  ScenarioProvenance,
  SimCityActorModel,
  SimCityScenarioV2,
  deepFreeze,
} from "../v2/types";
import { ScenarioPrompt } from "./ScenarioPrompt";
import { ALLOWED_PERTURBATIONS, validateScenario } from "./ScenarioValidator";

export interface CompileOptions {
  seed: number;
  registry: DomainRegistry;
  baselineEnvelopes?: readonly AnalyticsEnvelope[];
  evolution?: EvolutionFlags;
}

function normalizeDescription(description: string): string {
  return description.toLowerCase().trim();
}

function detectPerturbations(description: string, rng: SeededRng): ScenarioPerturbation[] {
  const normalized = normalizeDescription(description);
  const perturbations: ScenarioPerturbation[] = [];

  const pushPerturbation = (type: keyof typeof ALLOWED_PERTURBATIONS, multiplier: number) => {
    const spec = ALLOWED_PERTURBATIONS[type];
    const magnitudeBase = (spec.min + spec.max) / 2;
    const magnitude = Math.max(spec.min, Math.min(spec.max, magnitudeBase * multiplier));
    perturbations.push({
      type,
      domain: spec.domain,
      magnitude: Math.round(magnitude * 100) / 100,
      description: spec.description,
    });
  };

  if (normalized.includes("demand") || normalized.includes("spike")) {
    pushPerturbation("demandSpike", 1 + rng.real(0.1, 0.5));
  }

  if (normalized.includes("provider") || normalized.includes("supply") || normalized.includes("outage")) {
    pushPerturbation("providerDrop", 1);
  }

  if (normalized.includes("cancel") || normalized.includes("no-show") || normalized.includes("noshow")) {
    pushPerturbation("cancellationBias", 1);
  }

  if (normalized.includes("latency") || normalized.includes("slow") || normalized.includes("queue")) {
    pushPerturbation("latencyInflation", 1);
  }

  if (normalized.includes("fraud") || normalized.includes("trust") || normalized.includes("abuse")) {
    pushPerturbation("trustSignal", 1);
  }

  if (perturbations.length === 0) {
    throw new Error("No expressible perturbations found in description");
  }

  return perturbations;
}

function buildActors(seed: number): SimCityActorModel[] {
  return [
    {
      id: "user-behavior",
      kind: "user",
      domain: "booking",
      seed,
      assumptions: [
        "Demand is derived from historical envelopes; no personalization.",
        "No autonomy or learning is applied to users.",
      ],
    },
    {
      id: "provider-behavior",
      kind: "provider",
      domain: "provider",
      seed: seed + 1,
      assumptions: ["Provider availability is deterministic and seeded.", "No pricing changes are applied."],
    },
    {
      id: "system-load",
      kind: "system",
      domain: "ops",
      seed: seed + 2,
      assumptions: ["System load is inferred; no commands emitted.", "Side-channel only; no runtime hooks."],
    },
  ];
}

function buildProvenance(prompt: ScenarioPrompt, compiledAt: number): ScenarioProvenance {
  return {
    source: "scenario-compiler",
    compiledAt,
    description: prompt.description,
    intent: prompt.intent,
    constraints: prompt.constraints,
    forkFrom: prompt.forkFrom,
  };
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "scenario";
}

export function compileScenario(prompt: ScenarioPrompt, options: CompileOptions): SimCityScenarioV2 {
  const seed = options.seed;
  const rng = new SeededRng(seed);
  const perturbations = detectPerturbations(prompt.description, rng);
  const compiledAt = options.baselineEnvelopes?.[0]?.timestamp ?? seed;
  const actors = buildActors(seed);

  const scenario: SimCityScenarioV2 = {
    id: `sc-${slugify(prompt.description)}-${seed}`,
    label: prompt.intent ? `${prompt.intent.toUpperCase()} scenario` : "Scenario",
    seed,
    baselineEnvelopes: options.baselineEnvelopes ?? [],
    actors,
    assumptions: [
      "Compiled by scenario-compiler with deterministic seed.",
      "No production runtime coupling.",
      "Only governance-approved perturbations are applied.",
      ...(prompt.constraints ?? []),
    ],
    timeOrigin: options.baselineEnvelopes?.[0]?.timestamp,
    evolution: options.evolution,
    perturbations,
    provenance: buildProvenance(prompt, compiledAt),
    confidence: 0.8,
  };

  const validation = validateScenario(scenario, options.registry);
  if (!validation.valid) {
    throw new Error(`Scenario failed validation: ${validation.errors.join("; ")}`);
  }

  return deepFreeze(scenario);
}
