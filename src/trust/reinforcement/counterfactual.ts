import { AuditTimeline } from "@/audit/types";
import { computeP95, extractLatencyCandidate } from "@/audit/utils";
import { CounterfactualObservation, InterventionCounterfactual, RiskTrajectory } from "./types";

interface CounterfactualInput {
  readonly timeline: AuditTimeline;
  readonly trajectory: RiskTrajectory;
  readonly label?: string;
}

function computeMeanRisk(trajectory: RiskTrajectory): number {
  if (!trajectory.snapshots.length) return 0;
  const scores = trajectory.snapshots.map((snapshot) => {
    const fraud = snapshot.metrics.find((metric) => metric.dimension === "fraudLikelihood")?.value ?? 0;
    const noShow = snapshot.metrics.find((metric) => metric.dimension === "noShowHazard")?.value ?? 0;
    const abuse = snapshot.metrics.find((metric) => metric.dimension === "abuseRisk")?.value ?? 0;
    const reliability = snapshot.metrics.find((metric) => metric.dimension === "providerReliability")?.value ?? 1;
    const reliabilityRisk = 1 - reliability;
    return (fraud + noShow + abuse + reliabilityRisk) / 4;
  });
  const total = scores.reduce((sum, value) => sum + value, 0);
  return total / scores.length;
}

function deriveObservation(input: CounterfactualInput): CounterfactualObservation {
  const cancellations = input.timeline.frames.filter((frame) => frame.envelope.event.type === "booking.cancelled").length;
  const anomalies = input.timeline.frames.filter((frame) => frame.envelope.event.type.includes("anomaly")).length;
  const latencySamples = input.timeline.frames
    .map((frame) => extractLatencyCandidate(frame.envelope.metadata as Record<string, unknown> | undefined))
    .filter((value): value is number => typeof value === "number");
  const latencyP95Ms = latencySamples.length ? computeP95(latencySamples) : undefined;
  const totalFrames = input.timeline.frames.length || 1;
  const syntheticShare = input.timeline.frames.filter((frame) => frame.provenance === "synthetic").length / totalFrames;

  return {
    timelineId: input.timeline.id,
    trajectoryId: input.trajectory.id,
    meanRisk: computeMeanRisk(input.trajectory),
    cancellations,
    anomalies,
    latencyP95Ms,
    syntheticShare,
    evolution: input.timeline.evolutionFlags[input.trajectory.snapshots[0]?.domain ?? ""] ?? input.trajectory.snapshots[0]?.evolution,
  };
}

export function analyzeInterventionCounterfactual(baseline: CounterfactualInput, variant: CounterfactualInput): InterventionCounterfactual {
  const baselineObservation = deriveObservation(baseline);
  const variantObservation = deriveObservation(variant);

  const delta = {
    risk: variantObservation.meanRisk - baselineObservation.meanRisk,
    cancellations: variantObservation.cancellations - baselineObservation.cancellations,
    anomalies: variantObservation.anomalies - baselineObservation.anomalies,
    latencyP95Ms:
      typeof variantObservation.latencyP95Ms === "number" && typeof baselineObservation.latencyP95Ms === "number"
        ? variantObservation.latencyP95Ms - baselineObservation.latencyP95Ms
        : undefined,
  };

  const signals = [
    delta.risk > 0 ? "RISK_WORSE" : delta.risk < 0 ? "RISK_IMPROVED" : "RISK_STABLE",
    delta.cancellations > 0 ? "CANCELLATIONS_UP" : delta.cancellations < 0 ? "CANCELLATIONS_DOWN" : "CANCELLATIONS_STABLE",
    delta.anomalies > 0 ? "ANOMALIES_UP" : delta.anomalies < 0 ? "ANOMALIES_DOWN" : "ANOMALIES_STABLE",
  ];

  const assumptions = [
    "Counterfactual compares replayable timelines only; no side effects or commands are emitted.",
    "Differences are attributed to envelope sequences and synthetic forks, not to hidden runtime state.",
  ];
  if (baseline.label) assumptions.push(`Baseline: ${baseline.label}`);
  if (variant.label) assumptions.push(`Variant: ${variant.label}`);

  const governanceNotes = [
    `Baseline evolution: ${baselineObservation.evolution ? JSON.stringify(baselineObservation.evolution) : "none"}`,
    `Variant evolution: ${variantObservation.evolution ? JSON.stringify(variantObservation.evolution) : "none"}`,
  ];

  return {
    id: `counterfactual:${baseline.timeline.id}:vs:${variant.timeline.id}`,
    baseline: baselineObservation,
    variant: variantObservation,
    delta,
    signals,
    assumptions,
    replayCompatible: true,
    governanceNotes,
  };
}
