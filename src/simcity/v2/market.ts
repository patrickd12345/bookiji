import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { DomainRegistry } from "@/governance/DomainRegistry";
import {
  CounterfactualChange,
  CounterfactualResult,
  HistoricalProfile,
  MarketSimulationConfig,
  MarketSimulationResult,
  SimCityMarketState,
  SimCityScenarioV2,
  SimCitySyntheticEnvelope,
  assertRegistered,
  deepFreeze,
} from "./types";
import { UserBehaviorModel, ProviderBehaviorModel, SystemLoadModel, ActorContext } from "./actors";
import { SeededRng } from "./rng";
import { buildSyntheticEnvelope } from "./envelope";

function extractLatency(metadata: Record<string, unknown> | undefined): number | undefined {
  if (!metadata) return undefined;
  const candidates = [
    metadata.latencyP95Ms,
    metadata.p95Latency,
    metadata.latencyP95,
    (metadata.latency as Record<string, unknown> | undefined)?.p95,
  ];
  const numeric = candidates.find((candidate) => typeof candidate === "number") as number | undefined;
  return typeof numeric === "number" ? numeric : undefined;
}

export function deriveHistoricalProfile(envelopes: readonly AnalyticsEnvelope[]): HistoricalProfile {
  if (!envelopes.length) {
    return {
      demandPerTick: [1],
      cancellationsPerTick: [0],
      providersPerTick: [1],
      avgLatencyMs: 0,
    };
  }

  const buckets = new Map<
    number,
    { bookings: number; cancellations: number; providers: number; latencySum: number; latencyCount: number }
  >();

  envelopes.forEach((envelope, index) => {
    const logical = typeof envelope.timebase.logical === "number" ? envelope.timebase.logical : index;
    const bucket =
      buckets.get(logical) ?? { bookings: 0, cancellations: 0, providers: 0, latencySum: 0, latencyCount: 0 };

    if (envelope.event.type === "booking.created") bucket.bookings += 1;
    if (envelope.event.type === "booking.cancelled") bucket.cancellations += 1;
    if (envelope.event.type === "provider.updated") bucket.providers += 1;

    const latency = extractLatency(envelope.metadata as Record<string, unknown>);
    if (latency !== undefined) {
      bucket.latencySum += latency;
      bucket.latencyCount += 1;
    }

    buckets.set(logical, bucket);
  });

  const keys = Array.from(buckets.keys()).sort((a, b) => a - b);
  const demandPerTick = keys.map((key) => buckets.get(key)?.bookings ?? 0);
  const cancellationsPerTick = keys.map((key) => buckets.get(key)?.cancellations ?? 0);
  const providersPerTick = keys.map((key) => buckets.get(key)?.providers ?? 1);

  const latencySum = Array.from(buckets.values()).reduce((acc, bucket) => acc + bucket.latencySum, 0);
  const latencyCount = Array.from(buckets.values()).reduce((acc, bucket) => acc + bucket.latencyCount, 0);
  const avgLatencyMs = latencyCount === 0 ? 0 : latencySum / latencyCount;

  return {
    demandPerTick: demandPerTick.length ? demandPerTick : [1],
    cancellationsPerTick: cancellationsPerTick.length ? cancellationsPerTick : [0],
    providersPerTick: providersPerTick.length ? providersPerTick : [1],
    avgLatencyMs,
  };
}

export function runMarketSimulation(config: MarketSimulationConfig): MarketSimulationResult {
  const profile = deriveHistoricalProfile(config.scenario.baselineEnvelopes);
  const rng = new SeededRng(config.seed ^ config.scenario.seed);

  // Governance validation (domains must be present and not deprecated)
  config.scenario.actors.forEach((actor) => assertRegistered(actor.domain, config.registry));

  const userSeed = config.scenario.actors.find((actor) => actor.kind === "user")?.seed ?? config.seed;
  const providerSeed = config.scenario.actors.find((actor) => actor.kind === "provider")?.seed ?? config.seed + 1;
  const systemSeed = config.scenario.actors.find((actor) => actor.kind === "system")?.seed ?? config.seed + 2;

  const userActor = new UserBehaviorModel(userSeed);
  const providerActor = new ProviderBehaviorModel(providerSeed);
  const systemActor = new SystemLoadModel(systemSeed);
  const seedVariance = rng.real(0.9, 1.1) - 1;

  const states: SimCityMarketState[] = [];
  const envelopes: SimCitySyntheticEnvelope[] = [];
  const runId = `simcity-v2-${config.scenario.id}-${config.seed}${config.forkOf ? "-fork" : ""}`;

  let currentState: SimCityMarketState = {
    tick: 0,
    logicalTime: 0,
    demandLevel: profile.demandPerTick[0] ?? 0,
    providersAvailable: profile.providersPerTick[0] ?? 1,
    cancellations: profile.cancellationsPerTick[0] ?? 0,
    noShows: 0,
    retries: 0,
    stressIndex: 0,
    queueDepth: 0,
  };

  for (let tick = 0; tick < config.horizon; tick++) {
    const logicalTime = tick;
    const simTime = tick * 60_000; // deterministic minute ticks
    const baseContext: ActorContext = {
      tick,
      logicalTime,
      profile,
      priorState: currentState,
      demandShock: (config.demandShock ?? 0) + seedVariance,
      providerShock: config.providerShock,
      cancellationBias: config.cancellationBias,
    };

    const userStep = userActor.step(baseContext, rng.fork(`user-${tick}`));
    const providerStep = providerActor.step(baseContext, rng.fork(`provider-${tick}`));
    const provisionalState: SimCityMarketState = {
      tick,
      logicalTime,
      demandLevel: userStep.marketDelta.demandLevel ?? currentState.demandLevel,
      providersAvailable: providerStep.marketDelta.providersAvailable ?? currentState.providersAvailable,
      cancellations: userStep.marketDelta.cancellations ?? currentState.cancellations,
      noShows: userStep.marketDelta.noShows ?? currentState.noShows,
      retries: userStep.marketDelta.retries ?? currentState.retries,
      stressIndex: currentState.stressIndex,
      queueDepth: currentState.queueDepth,
    };

    const systemStep = systemActor.step({ ...baseContext, priorState: provisionalState }, rng.fork(`system-${tick}`));
    const finalState: SimCityMarketState = {
      ...provisionalState,
      stressIndex: systemStep.marketDelta.stressIndex ?? provisionalState.stressIndex,
      queueDepth: systemStep.marketDelta.queueDepth ?? provisionalState.queueDepth,
    };

    states.push(finalState);
    currentState = finalState;

    const plans = [...userStep.events, ...providerStep.events, ...systemStep.events];
    let ordinal = 0;

    for (const plan of plans) {
      const domain = plan.domain ?? "simcity";
      const governance = assertRegistered(domain, config.registry);

      envelopes.push(
        buildSyntheticEnvelope({
          plan,
          scenario: config.scenario,
          runId,
          logicalTime,
          simTime,
          ordinal: ordinal++,
          governance: {
            domain,
            permitted: true,
            reason: undefined,
            evolution: governance.evolution,
          },
          forkOf: config.forkOf,
          baseline: !config.forkOf,
        })
      );
    }
  }

  return deepFreeze({
    runId,
    envelopes,
    states,
    profile,
  });
}

function averageStress(states: readonly SimCityMarketState[]): number {
  if (!states.length) return 0;
  const total = states.reduce((acc, state) => acc + state.stressIndex, 0);
  return total / states.length;
}

export function forkTimeline(options: {
  scenario: SimCityScenarioV2;
  registry: DomainRegistry;
  seed: number;
  horizon: number;
  change: CounterfactualChange;
}): CounterfactualResult {
  const changeKinds = ["demand", "provider", "cancellation"] as const;
  if (!changeKinds.includes(options.change.kind)) {
    throw new Error("Unsupported counterfactual change");
  }

  const baseline = runMarketSimulation({
    scenario: options.scenario,
    registry: options.registry,
    seed: options.seed,
    horizon: options.horizon,
  });

  const variantConfig: MarketSimulationConfig = {
    scenario: options.scenario,
    registry: options.registry,
    seed: options.seed,
    horizon: options.horizon,
    forkOf: baseline.runId,
    ...(options.change.kind === "demand" && { demandShock: options.change.magnitude }),
    ...(options.change.kind === "provider" && { providerShock: -Math.abs(options.change.magnitude) }),
    ...(options.change.kind === "cancellation" && { cancellationBias: options.change.magnitude }),
  };

  const variant = runMarketSimulation(variantConfig);

  const bookingsDelta =
    variant.states.reduce((acc, state) => acc + state.demandLevel, 0) -
    baseline.states.reduce((acc, state) => acc + state.demandLevel, 0);
  const cancellationDelta =
    variant.states.reduce((acc, state) => acc + state.cancellations, 0) -
    baseline.states.reduce((acc, state) => acc + state.cancellations, 0);
  const stressDelta = averageStress(variant.states) - averageStress(baseline.states);

  return deepFreeze({
    baseline,
    variant,
    delta: {
      bookings: bookingsDelta,
      cancellations: cancellationDelta,
      stress: stressDelta,
    },
  });
}

export function createScenarioFromHistory(input: {
  id: string;
  label: string;
  seed: number;
  baselineEnvelopes: readonly AnalyticsEnvelope[];
  evolution?: SimCityScenarioV2["evolution"];
}): SimCityScenarioV2 {
  return deepFreeze({
    id: input.id,
    label: input.label,
    seed: input.seed,
    baselineEnvelopes: [...input.baselineEnvelopes],
    actors: [
      {
        id: "user-behavior",
        kind: "user",
        domain: "booking",
        seed: input.seed,
        assumptions: ["Demand follows historical envelopes", "No user autonomy", "Seeded deterministic path"],
      },
      {
        id: "provider-behavior",
        kind: "provider",
        domain: "provider",
        seed: input.seed + 1,
        assumptions: ["Provider shifts are deterministic", "No live pricing pressure", "Seeded deterministic path"],
      },
      {
        id: "system-load",
        kind: "system",
        domain: "ops",
        seed: input.seed + 2,
        assumptions: ["System load is derived; no feedback loops", "Side-channel only", "Seeded deterministic path"],
      },
    ],
    assumptions: [
      "SimCity v2 runs side-channel and never touches production runtime.",
      "All randomness is derived from the provided seed.",
      "Historical analytics envelopes are the only input substrate.",
    ],
    timeOrigin: input.baselineEnvelopes[0]?.timestamp,
    evolution: input.evolution,
    perturbations: [],
    provenance: {
      source: "scenario-compiler",
      compiledAt: input.baselineEnvelopes[0]?.timestamp ?? input.seed,
      description: input.label,
    },
    confidence: 1,
  });
}
