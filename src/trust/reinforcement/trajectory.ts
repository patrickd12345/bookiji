import { AuditTimeline } from "@/audit/types";
import { deepFreeze, extractLatencyCandidate } from "@/audit/utils";
import { RiskTrajectory, RiskStateSnapshot, RiskMetric, RiskConfidence, RiskDimension } from "./types";

type RiskAccumulator = {
  fraudLikelihood: number;
  noShowHazard: number;
  providerReliability: number;
  abuseRisk: number;
};

const clamp = (value: number, min = 0, max = 1) => Math.max(min, Math.min(max, value));

function deriveConfidence(signals: readonly string[], provenance: RiskStateSnapshot["provenance"]): RiskConfidence {
  if ((signals?.length ?? 0) >= 4) return provenance === "synthetic" ? "medium" : "high";
  if ((signals?.length ?? 0) >= 2) return "medium";
  return "low";
}

function trend(current: number, previous: number): RiskMetric["trend"] {
  if (current > previous + 0.01) return "up";
  if (current < previous - 0.01) return "down";
  return "flat";
}

function normalizeSignal(signal: string): string {
  return signal.trim().toLowerCase();
}

function applyTrustSafetySignals(state: RiskAccumulator, signals: readonly string[]): RiskAccumulator {
  const next = { ...state };
  signals.forEach((signal) => {
    const normalized = normalizeSignal(signal);
    if (normalized.includes("fraud") || normalized.includes("chargeback")) {
      next.fraudLikelihood = clamp(next.fraudLikelihood + 0.12);
    }
    if (normalized.includes("abuse") || normalized.includes("spam")) {
      next.abuseRisk = clamp(next.abuseRisk + 0.1);
    }
    if (normalized.includes("cancel") || normalized.includes("no_show")) {
      next.noShowHazard = clamp(next.noShowHazard + 0.1);
    }
    if (normalized.includes("reliable") || normalized.includes("positive")) {
      next.providerReliability = clamp(next.providerReliability + 0.04);
    }
  });
  return next;
}

function applyEventAdjustments(state: RiskAccumulator, eventType: string, metadata: Record<string, unknown> | undefined): RiskAccumulator {
  const next = { ...state };
  const severity = (() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const maybeSeverity = (metadata as any)?.severity ?? (metadata as any)?.anomalySeverity ?? (metadata as any)?.simcity?.severity;
    if (typeof maybeSeverity === "string") {
      const value = maybeSeverity.toLowerCase();
      if (value === "critical") return 0.35;
      if (value === "high" || value === "sev1" || value === "sev0") return 0.25;
      if (value === "medium" || value === "sev2") return 0.18;
      return 0.1;
    }
    return 0.12;
  })();

  const lowerType = eventType.toLowerCase();
  if (lowerType === "booking.created") {
    next.noShowHazard = clamp(next.noShowHazard - 0.05);
    next.providerReliability = clamp(next.providerReliability + 0.02);
  } else if (lowerType === "booking.cancelled") {
    next.noShowHazard = clamp(next.noShowHazard + 0.25);
    next.providerReliability = clamp(next.providerReliability - 0.1);
  } else if (lowerType === "booking.updated") {
    next.providerReliability = clamp(next.providerReliability - 0.02);
  } else if (lowerType === "anomaly.detected") {
    next.fraudLikelihood = clamp(next.fraudLikelihood + severity);
    next.abuseRisk = clamp(next.abuseRisk + 0.05);
  } else if (lowerType === "ops.incident.created") {
    next.providerReliability = clamp(next.providerReliability - 0.2);
    next.noShowHazard = clamp(next.noShowHazard + 0.08);
  }

  const latency = extractLatencyCandidate(metadata);
  if (typeof latency === "number" && latency > 0) {
    if (latency > 800) {
      next.providerReliability = clamp(next.providerReliability - 0.12);
      next.noShowHazard = clamp(next.noShowHazard + 0.08);
    } else if (latency > 400) {
      next.providerReliability = clamp(next.providerReliability - 0.06);
    }
  }

  return next;
}

function buildMetrics(
  next: RiskAccumulator,
  previous: RiskAccumulator,
  signals: readonly string[],
  governanceDomain: string,
  confidence: RiskConfidence,
): RiskMetric[] {
  const rationale = (dimension: RiskDimension): string => {
    if (dimension === "providerReliability") {
      return "Reliability decays with cancellations, incidents, and latency spikes.";
    }
    if (dimension === "noShowHazard") {
      return "No-show hazard rises with cancellations and trust safety signals referencing cancellations.";
    }
    if (dimension === "abuseRisk") {
      return "Abuse risk aggregates anomalies and explicit abuse signals.";
    }
    return "Fraud likelihood increases with anomalies, chargebacks, and fraud-tagged signals.";
  };

  return (Object.keys(next) as RiskDimension[]).map((dimension) => ({
    dimension,
    value: clamp(next[dimension as keyof RiskAccumulator]),
    trend: trend(next[dimension as keyof RiskAccumulator], previous[dimension as keyof RiskAccumulator]),
    confidence,
    signals: [governanceDomain, ...signals],
    rationale: rationale(dimension),
  }));
}

export function buildRiskTrajectory(timeline: AuditTimeline, id = `risk-trajectory:${timeline.id}`): RiskTrajectory {
  const base: RiskAccumulator = {
    fraudLikelihood: 0.08,
    noShowHazard: 0.05,
    providerReliability: 0.92,
    abuseRisk: 0.05,
  };

  const snapshots: RiskStateSnapshot[] = [];
  const warnings: string[] = [];
  let previous = base;

  timeline.frames.forEach((frame) => {
    const metadata = (frame.envelope.metadata ?? {}) as Record<string, unknown>;
    const signals = [
      frame.envelope.event.type,
      ...(frame.trustSafety?.signals ?? []),
      ...(Array.isArray(metadata.signals) ? (metadata.signals as string[]) : []),
    ];

    let state = applyEventAdjustments(previous, frame.envelope.event.type, metadata);
    state = applyTrustSafetySignals(state, frame.trustSafety?.signals ?? []);

    const confidence = deriveConfidence(signals, frame.provenance);
    const metrics = buildMetrics(state, previous, signals, frame.governance.domain, confidence);
    const assumptions: string[] = [
      "Trajectory uses monotonic accumulation; reliability decays on negative signals.",
      "Analytics envelopes are treated as ground truth; no commands emitted.",
    ];
    if (frame.provenance === "synthetic") {
      assumptions.push("Synthetic provenance adjusts confidence downward; interpretations remain diagnostic-only.");
    }

    snapshots.push(
      deepFreeze({
        id: `${id}:${frame.id}`,
        frameId: frame.id,
        timelineId: timeline.id,
        domain: frame.governance.domain,
        timestamp: frame.timestamp,
        logicalTime: frame.logicalTime,
        provenance: frame.provenance,
        metrics,
        signals,
        assumptions,
        governance: frame.governance,
        evolution: frame.evolution,
        syntheticContext: frame.syntheticContext,
      }),
    );

    previous = state;
  });

  if (!snapshots.length) {
    warnings.push("No frames provided; trajectory contains no risk evolution.");
  }

  return deepFreeze({
    id,
    timelineId: timeline.id,
    startedAt: timeline.startedAt,
    endedAt: timeline.endedAt,
    snapshots,
    derivedFrom: {
      frameIds: timeline.frames.map((frame) => frame.id),
      timelineStartedAt: timeline.startedAt,
    },
    warnings,
    replayCompatible: true,
  });
}
