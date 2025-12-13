import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { EvolutionFlags } from "@/governance/EvolutionFlags";
import { AuditFrame, EnvelopeProvenance, TimelineGovernance, TrustSafetySnapshot } from "./types";

export function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((child) => {
      deepFreeze(child as unknown as T);
    });
  }
  return value;
}

export function deriveDomain(eventType: string): string {
  return eventType.split(".")[0] ?? "unknown";
}

export function cloneEnvelope(envelope: AnalyticsEnvelope): AnalyticsEnvelope {
  if (typeof structuredClone === "function") {
    return structuredClone(envelope);
  }
  return JSON.parse(JSON.stringify(envelope)) as AnalyticsEnvelope;
}

export function ensureOrdered(envelopes: readonly AnalyticsEnvelope[]): void {
  let lastTimestamp = -Infinity;
  let lastLogical = -Infinity;
  envelopes.forEach((envelope) => {
    if (envelope.timestamp < lastTimestamp) {
      throw new Error(`Envelope ${envelope.id} is out of chronological order`);
    }
    const logical = typeof envelope.timebase.logical === "number" ? envelope.timebase.logical : 0;
    if (logical < lastLogical) {
      throw new Error(`Envelope ${envelope.id} violates logical time ordering`);
    }
    lastTimestamp = envelope.timestamp;
    lastLogical = logical;
  });
}

export function detectSyntheticProvenance(envelope: AnalyticsEnvelope): {
  provenance: EnvelopeProvenance;
  simTime?: number;
  syntheticContext?: AuditFrame["syntheticContext"];
} {
  const envelopeMetadata = envelope.metadata as Record<string, unknown> | undefined;
  const simcity = envelopeMetadata?.simcity as Record<string, unknown> | undefined;
  const flaggedSynthetic =
    envelopeMetadata?.synthetic === true ||
    envelope.source === "simcity" ||
    simcity?.synthetic === true;

  const provenance: EnvelopeProvenance = flaggedSynthetic ? "synthetic" : "real";
  const syntheticContext =
    provenance === "synthetic"
      ? {
          runId: typeof simcity?.runId === "string" ? simcity.runId : undefined,
          scenarioId: typeof simcity?.scenarioId === "string" ? simcity.scenarioId : undefined,
          forkOf: typeof simcity?.forkOf === "string" ? simcity.forkOf : undefined,
          baseline: typeof simcity?.baseline === "boolean" ? simcity.baseline : undefined,
        }
      : undefined;

  const simTime = typeof simcity?.simTime === "number" ? simcity.simTime : envelope.timebase.simTime;
  return { provenance, simTime, syntheticContext };
}

export function extractEvolution(envelope: AnalyticsEnvelope, fallback?: EvolutionFlags): EvolutionFlags | undefined {
  const metadata = envelope.metadata as Record<string, unknown> | undefined;
  if (metadata && typeof metadata.evolution === "object") {
    return metadata.evolution as EvolutionFlags;
  }
  return fallback;
}

export function extractTrustSafetySignals(
  envelope: AnalyticsEnvelope,
  provenance: EnvelopeProvenance
): TrustSafetySnapshot | undefined {
  const metadata = envelope.metadata as Record<string, unknown> | undefined;
  const trustSafety = (metadata?.trustSafety ?? (metadata?.simcity as Record<string, unknown> | undefined)?.trustSafety) as { signals?: unknown[] } | undefined;
  const signals = Array.isArray(trustSafety?.signals) ? (trustSafety.signals as unknown[]).map(String) : [];
  if (!signals.length) return undefined;
  const uniqueSignals = Array.from(new Set(signals));
  return { provenance, signals: uniqueSignals as readonly string[] };
}

export function extractLatencyCandidate(metadata?: Record<string, unknown>): number | undefined {
  if (!metadata) return undefined;
  const candidates = [
    metadata.latencyP95Ms,
    metadata.p95Latency,
    metadata.latencyP95,
    (metadata.latency as Record<string, unknown> | undefined)?.p95,
  ];
  const numeric = candidates.find((value) => typeof value === "number") as number | undefined;
  return typeof numeric === "number" ? numeric : undefined;
}

export function computeP95(samples: number[]): number {
  if (!samples.length) return 0;
  const sorted = [...samples].sort((a, b) => a - b);
  const rank = Math.ceil(0.95 * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(sorted.length - 1, rank))];
}

export function governanceFallback(domain: string): TimelineGovernance {
  return {
    domain,
    permitted: true,
  };
}
