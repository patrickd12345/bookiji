import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";
import { SeededRng } from "./rng";
import { HistoricalProfile, SimCityActorModel, SimCityMarketState } from "./types";

export interface ActorContext {
  tick: number;
  logicalTime: number;
  profile: HistoricalProfile;
  priorState: SimCityMarketState;
  demandShock?: number;
  providerShock?: number;
  cancellationBias?: number;
}

export interface SimulatedEventPlan {
  event: StandardizedEvent;
  metadata?: Record<string, unknown>;
  trustSafetySignals?: string[];
  domain?: string;
}

export interface ActorStepResult {
  marketDelta: Partial<SimCityMarketState>;
  events: SimulatedEventPlan[];
}

abstract class DeterministicActor implements SimCityActorModel {
  readonly id: string;
  readonly kind: SimCityActorModel["kind"];
  readonly domain: string;
  readonly seed: number;
  readonly assumptions: string[];

  protected constructor(id: string, kind: SimCityActorModel["kind"], domain: string, seed: number, assumptions: string[]) {
    this.id = id;
    this.kind = kind;
    this.domain = domain;
    this.seed = seed;
    this.assumptions = assumptions;
  }

  abstract step(context: ActorContext, rng: SeededRng): ActorStepResult;
}

export class UserBehaviorModel extends DeterministicActor {
  constructor(seed: number) {
    super(
      "user-behavior",
      "user",
      "booking",
      seed,
      [
        "Demand is derived from historical envelopes; no personalization.",
        "Cancellations and no-shows follow deterministic ratios.",
        "Retries are bounded to avoid infinite loops.",
      ]
    );
  }

  step(context: ActorContext, rng: SeededRng): ActorStepResult {
    const baseDemand = context.profile.demandPerTick[context.tick % context.profile.demandPerTick.length] || 1;
    const wave = 1 + 0.35 * Math.sin((context.tick + 1) / 3);
    const shock = context.demandShock ?? 0;
    const demandLevel = Math.max(0, baseDemand * (wave + 1 + shock));
    const demandNoise = rng.real(0.85, 1.15);
    const normalizedDemand = Math.max(0, Math.round(demandLevel * demandNoise * 10) / 10);

    const baseCancellationRate =
      context.profile.cancellationsPerTick[context.tick % context.profile.cancellationsPerTick.length] /
        Math.max(1, baseDemand) || 0;
    const cancellationRate = Math.min(0.9, Math.max(0, baseCancellationRate + (context.cancellationBias ?? 0)));
    const cancellations = Math.round(normalizedDemand * cancellationRate * 0.5);
    const noShows = Math.round(normalizedDemand * cancellationRate * 0.25);
    const retries = Math.round(normalizedDemand * 0.1);

    const bookingEvent: SimulatedEventPlan = {
      event: {
        type: "booking.created",
        payload: {
          bookingId: `sim-${context.logicalTime}-booking`,
          providerId: `provider-${(context.tick % 5) + 1}`,
        },
      },
      metadata: {
        demandLevel: normalizedDemand,
        retries,
        cancellations,
        noShows,
      },
      domain: this.domain,
    };

    const cancellationEvent: SimulatedEventPlan | null =
      cancellations > 0
        ? {
            event: {
              type: "booking.cancelled",
              payload: {
                bookingId: `sim-${context.logicalTime}-booking`,
                providerId: `provider-${(context.tick % 5) + 1}`,
                reason: "simulated_cancellation",
              },
            },
            metadata: { cancellations },
            domain: this.domain,
          }
        : null;

    const retryEvent: SimulatedEventPlan | null =
      retries > 0
        ? {
            event: {
              type: "booking.updated",
              payload: {
                bookingId: `sim-${context.logicalTime}-booking`,
                providerId: `provider-${(context.tick % 5) + 1}`,
                changes: { retries, lastRetryTick: context.tick },
              },
            },
            metadata: { retries },
            domain: this.domain,
          }
        : null;

    const events: SimulatedEventPlan[] = [bookingEvent];
    if (cancellationEvent) events.push(cancellationEvent);
    if (retryEvent) events.push(retryEvent);

    return {
      marketDelta: {
        demandLevel: normalizedDemand,
        cancellations,
        noShows,
        retries,
      },
      events,
    };
  }
}

export class ProviderBehaviorModel extends DeterministicActor {
  constructor(seed: number) {
    super(
      "provider-behavior",
      "provider",
      "provider",
      seed,
      [
        "Provider availability shifts deterministically around historical counts.",
        "No dynamic pricing or incentives are applied.",
        "Provider state never mutates outside the simulation loop.",
      ]
    );
  }

  step(context: ActorContext, rng: SeededRng): ActorStepResult {
    const baseProviders =
      context.profile.providersPerTick[context.tick % context.profile.providersPerTick.length] ||
      context.profile.providersPerTick[0] ||
      1;
    const shift = 1 + 0.2 * Math.cos(context.tick / 2);
    const shock = context.providerShock ?? 0;
    const providersAvailable =
      Math.max(1, Math.round(baseProviders * (shift + shock) * rng.real(0.85, 1.15) * 10) / 10);

    const event: SimulatedEventPlan = {
      event: {
        type: "provider.updated",
        payload: {
          providerId: `provider-${(context.tick % 5) + 1}`,
          fields: ["availability", "status"],
          updatedAt: context.logicalTime,
        },
      },
      metadata: {
        providersAvailable,
        providerShift: shift + shock,
      },
      domain: this.domain,
    };

    return {
      marketDelta: { providersAvailable },
      events: [event],
    };
  }
}

export class SystemLoadModel extends DeterministicActor {
  constructor(seed: number) {
    super(
      "system-load",
      "system",
      "ops",
      seed,
      [
        "Stress is derived from demand versus capacity; no feedback loops.",
        "Queue depth is clamped to avoid runaway load in tests.",
        "Trust & Safety signals are simulated only when stress is elevated.",
      ]
    );
  }

  step(context: ActorContext, rng: SeededRng): ActorStepResult {
    const demand = context.priorState.demandLevel;
    const capacity = Math.max(1, context.priorState.providersAvailable);
    const queueDepth = Math.max(0, demand - capacity);
    const stress = Math.min(1, Math.max(0, demand === 0 ? 0 : (demand - capacity) / (demand + capacity)));
    const anomalyScore = Math.max(0, Math.min(1, stress + rng.real(0, 0.1)));

    const events: SimulatedEventPlan[] = [];

    if (anomalyScore > 0.6) {
      events.push({
        event: {
          type: "anomaly.detected",
          payload: {
            anomalyId: `sim-${context.logicalTime}-stress`,
            severity: anomalyScore > 0.8 ? "high" : "medium",
            description: "Simulated stress anomaly",
          },
        },
        metadata: {
          stressIndex: stress,
          queueDepth,
          anomalyScore,
        },
        trustSafetySignals: ["synthetic_stress", "synthetic_queue"],
        domain: this.domain,
      });
    }

    return {
      marketDelta: {
        stressIndex: stress,
        queueDepth,
      },
      events,
    };
  }
}
