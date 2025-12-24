import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { adaptAnalyticsEnvelopeToOpsAI } from "../contracts/OpsAIEnvelopeAdapter";
import { resolveGovernanceTrace } from "./governance";
import {
  OpsAIArtifact,
  OpsAICounterfactual,
  OpsAIExplanation,
  OpsAIInsight,
  OpsAIPrediction,
  OpsAIv2Config,
  OpsAIv2Result,
} from "./types";
import { DomainRegistry } from "@/governance/DomainRegistry";

function normalizeEventType(eventType: string): string {
  return eventType.replace(/\./g, "_").toUpperCase();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function extractLatency(metadata: Record<string, unknown>): number | undefined {
  const candidates = [
    metadata.latencyP95Ms,
    metadata.p95Latency,
    metadata.latencyP95,
    (metadata.latency as Record<string, unknown> | undefined)?.p95,
  ];

  const numeric = candidates.find((value) => typeof value === "number");
  return typeof numeric === "number" ? numeric : undefined;
}

function extractSloViolation(metadata: Record<string, unknown>): boolean {
  if (typeof metadata.sloViolation === "boolean") return metadata.sloViolation;
  if (typeof metadata.sloBreached === "boolean") return metadata.sloBreached;
  if (typeof metadata.sloStatus === "string") {
    return metadata.sloStatus.toLowerCase() === "violated" || metadata.sloStatus.toLowerCase() === "breached";
  }
  return false;
}

function computePredictionMetrics(envelope: AnalyticsEnvelope, metadata: Record<string, unknown>) {
  const latencyP95 = extractLatency(metadata) ?? 0;
  const sloViolation = extractSloViolation(metadata);
  const normalizedType = normalizeEventType(envelope.event.type);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const severity = (envelope.event as any)?.payload?.severity as string | undefined;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const anomalyScore = typeof (metadata as any).anomalyScore === "number" ? (metadata as any).anomalyScore : undefined;

  const severityWeight = (() => {
    if (!severity) return 0.1;
    if (severity === "low") return 0.2;
    if (severity === "medium") return 0.35;
    if (severity === "high" || severity === "sev2" || severity === "sev1") return 0.65;
    if (severity === "critical" || severity === "sev0") return 0.85;
    return 0.25;
  })();

  const anomalyLikelihood = clamp(
    (normalizedType.includes("ANOMALY") ? 0.55 : 0.25) +
      (anomalyScore ?? 0) * 0.6 +
      severityWeight * 0.6 +
      (latencyP95 > 600 ? 0.2 : latencyP95 > 300 ? 0.1 : 0),
    0,
    0.99,
  );

  const sloBreachProbability = clamp(
    (sloViolation ? 0.9 : 0.25) +
      (latencyP95 / 1000) * 0.4 +
      (severityWeight > 0.6 ? 0.1 : 0) +
      (normalizedType.includes("INCIDENT") ? 0.2 : 0),
    0.05,
    0.99,
  );

  const activeLoad =
    (typeof metadata.activeBookings === "number" && metadata.activeBookings) ||
    (typeof metadata.concurrentRequests === "number" && metadata.concurrentRequests) ||
    (typeof metadata.requestRate === "number" && metadata.requestRate) ||
    0;
  const capacity = (typeof metadata.capacity === "number" && metadata.capacity) || (typeof metadata.pods === "number" && metadata.pods * 10) || 50;
  const loadRatio = capacity > 0 ? activeLoad / capacity : 0;

  const stressForecast = clamp(
    loadRatio * 0.6 + (latencyP95 > 0 ? clamp(latencyP95 / 1200, 0, 1) * 0.4 : 0) + (sloViolation ? 0.15 : 0),
    0.05,
    0.98,
  );

  return { anomalyLikelihood, sloBreachProbability, stressForecast, latencyP95 };
}

function deriveCounterfactual(envelope: AnalyticsEnvelope, metadata: Record<string, unknown>, horizonMs: number, sloBreachProbability: number) {
  const baselineLatency = extractLatency(metadata) ?? 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const severity = (envelope.event as any)?.payload?.severity as string | undefined;
  const normalizedType = normalizeEventType(envelope.event.type);
  const anomalySignal = normalizedType.includes("ANOMALY") || normalizedType.includes("INCIDENT") ? 1 : 0;

  const reductionFactor = severity === "critical" || severity === "high" ? 0.35 : severity === "medium" ? 0.2 : 0.1;
  const simulatedLatency = baselineLatency * (1 - reductionFactor);
  const baseline = {
    latencyP95Ms: baselineLatency,
    sloBreachProbability: sloBreachProbability,
    anomalySignal,
  };
  const simulated = {
    latencyP95Ms: simulatedLatency,
    sloBreachProbability: clamp(sloBreachProbability - reductionFactor, 0, 0.99),
    anomalySignal: Math.max(0, anomalySignal - reductionFactor),
  };

  const deltas = {
    latencyP95Ms: simulated.latencyP95Ms - baseline.latencyP95Ms,
    sloBreachProbability: simulated.sloBreachProbability - baseline.sloBreachProbability,
    anomalySignal: simulated.anomalySignal - baseline.anomalySignal,
  };

  const simCity = (() => {
    const simMeta = metadata.simcity || metadata.simCity || {};
    if (!simMeta || typeof simMeta !== "object") return undefined;
    const cast = simMeta as Record<string, unknown>;
    const runId = typeof cast.runId === "string" ? cast.runId : undefined;
    const scenarioId = typeof cast.scenarioId === "string" ? cast.scenarioId : undefined;
    const simTime = typeof cast.simTime === "number" ? cast.simTime : undefined;
    if (!runId && !scenarioId && typeof simTime !== "number") return undefined;
    return { runId, scenarioId, simTime };
  })();

  const assumptions = [
    "Counterfactual assumes the triggering event could be rolled back without side-effects.",
    "Latency impact scales linearly with anomaly severity.",
    "Governance prohibits direct commands; only diagnostics emitted.",
  ];

  if (simCity) {
    assumptions.push("SimCity metadata present: projections tied to synthetic timeline.");
  }

  return { baseline, simulated, deltas, assumptions, simCity, horizonMs };
}

function describeSignals(envelope: AnalyticsEnvelope, metadata: Record<string, unknown>): string[] {
  const normalizedType = normalizeEventType(envelope.event.type);
  const signals = [normalizedType, envelope.event.type];
  if (extractSloViolation(metadata)) signals.push("SLO_VIOLATION");
  const latency = extractLatency(metadata);
  if (latency) signals.push(`LATENCY_P95_${latency}`);
  if (metadata.anomaly) signals.push("ANOMALY_METADATA");
  if (metadata.simcity || metadata.simCity) signals.push("SIMCITY_CONTEXT");
  return signals;
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object") {
    Object.freeze(value);
    Object.values(value as Record<string, unknown>).forEach((child) => deepFreeze(child as never));
  }
  return value;
}

export function runOpsAIV2(envelope: AnalyticsEnvelope, registry?: DomainRegistry, config: OpsAIv2Config = {}): OpsAIv2Result {
  if (!config.enabled) {
    return {
      mode: "v1-fallback",
      artifacts: [],
      fallback: adaptAnalyticsEnvelopeToOpsAI(envelope),
    };
  }

  const metadata = (envelope.metadata ?? {}) as Record<string, unknown>;
  const governance = resolveGovernanceTrace(envelope.event.type, registry);
  const normalizedType = normalizeEventType(envelope.event.type);
  const baseId = `${envelope.id}:${normalizedType}`;

  if (!governance.permitted) {
    const explanation: OpsAIExplanation = {
      id: `${baseId}:governance`,
      kind: "explanation",
      envelopeId: envelope.id,
      createdAt: envelope.timestamp,
      source: envelope.source,
      governance,
      steps: ["Governance registry rejected reasoning for this domain.", governance.reason ?? "No reason provided."],
      contractsReferenced: governance.contract ? [governance.contract.version] : ["unregistered"],
      assumptions: ["Diagnostics only. No commands produced.", "Governance contract must approve domain reasoning."],
      signalsUsed: [normalizedType],
    };

    return { mode: "governance-blocked", artifacts: [deepFreeze(explanation)] };
  }

  const predictionMetrics = computePredictionMetrics(envelope, metadata);
  const horizonMs = 5 * 60 * 1000; // 5 minutes lookahead
  const counterfactual = deriveCounterfactual(envelope, metadata, horizonMs, predictionMetrics.sloBreachProbability);
  const signals = describeSignals(envelope, metadata);

  const insight: OpsAIInsight = {
    id: `${baseId}:insight`,
    kind: "insight",
    envelopeId: envelope.id,
    createdAt: envelope.timestamp,
    source: envelope.source,
    governance,
    summary: `Observed ${envelope.event.type} with normalized type ${normalizedType}.`,
    signals,
    diagnostics: {
      latencyP95Ms: predictionMetrics.latencyP95,
      sloViolation: extractSloViolation(metadata),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      anomalySeverity: (envelope.event as any)?.payload?.severity,
    },
    evolutionFlags: config.evolutionFlags?.[governance.domain] ?? governance.evolution,
  };

  const prediction: OpsAIPrediction = {
    id: `${baseId}:prediction`,
    kind: "prediction",
    envelopeId: envelope.id,
    createdAt: envelope.timestamp,
    source: envelope.source,
    governance,
    horizonMs,
    metrics: {
      anomalyLikelihood: predictionMetrics.anomalyLikelihood,
      sloBreachProbability: predictionMetrics.sloBreachProbability,
      stressForecast: predictionMetrics.stressForecast,
    },
    basis: signals,
  };

  const counterfactualArtifact: OpsAICounterfactual = {
    id: `${baseId}:counterfactual`,
    kind: "counterfactual",
    envelopeId: envelope.id,
    createdAt: envelope.timestamp,
    source: envelope.source,
    governance,
    scenario: `If ${normalizedType} had not occurred`,
    baseline: counterfactual.baseline,
    simulated: counterfactual.simulated,
    deltas: counterfactual.deltas,
    assumptions: counterfactual.assumptions,
    simCity: counterfactual.simCity,
  };

  const explanation: OpsAIExplanation = {
    id: `${baseId}:explanation`,
    kind: "explanation",
    envelopeId: envelope.id,
    createdAt: envelope.timestamp,
    source: envelope.source,
    governance,
    steps: [
      "Apply deterministic heuristics on latency, SLO hints, and anomaly severity.",
      "Forecast near-future breach/stress based on load ratio and latency trajectory.",
      "Compare baseline vs simulated futures to illustrate impact of removing this event.",
    ],
    contractsReferenced: [governance.contractVersion],
    assumptions: [
      "Uses only Analytics Envelope inputs; no side effects.",
      "Diagnostics only; notification channels are not invoked directly.",
      ...(config.trustSafetySchemas ?? []).map((schema) => `Trust & Safety schema observed: ${schema}`),
    ],
    signalsUsed: signals,
  };

  const artifacts: OpsAIArtifact[] = [insight, prediction, counterfactualArtifact, explanation].map((artifact) => deepFreeze(artifact));

  return { mode: "v2", artifacts };
}
