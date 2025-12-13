import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { AuditFrame, AuditTimeline, DiffExplanation, TimelineDiff } from "./types";
import {
  computeP95,
  deepFreeze,
  deriveDomain,
  extractLatencyCandidate,
  governanceFallback,
} from "./utils";

interface TimelineSummary {
  eventCounts: Record<string, number>;
  trustSafetySignals: Set<string>;
  latencies: number[];
  bookings: number;
  cancellations: number;
  byDomain: Map<string, AuditFrame>;
}

function summarizeTimeline(timeline: AuditTimeline): TimelineSummary {
  const eventCounts: Record<string, number> = {};
  const trustSafetySignals = new Set<string>();
  const latencies: number[] = [];
  let bookings = 0;
  let cancellations = 0;
  const byDomain = new Map<string, AuditFrame>();

  timeline.frames.forEach((frame) => {
    const type = frame.envelope.event.type;
    eventCounts[type] = (eventCounts[type] ?? 0) + 1;
    if (type === "booking.created") bookings += 1;
    if (type === "booking.cancelled") cancellations += 1;

    frame.trustSafety?.signals.forEach((signal) => trustSafetySignals.add(signal));

    const latency = extractLatencyCandidate(frame.envelope.metadata as Record<string, unknown>);
    if (typeof latency === "number") {
      latencies.push(latency);
    }

    if (!byDomain.has(frame.governance.domain)) {
      byDomain.set(frame.governance.domain, frame);
    }
  });

  return { eventCounts, trustSafetySignals, latencies, bookings, cancellations, byDomain };
}

function diffIds(left: readonly AuditFrame[], right: readonly AuditFrame[]): string[] {
  const rightIds = new Set(right.map((frame) => frame.id));
  return left.filter((frame) => !rightIds.has(frame.id)).map((frame) => frame.id);
}

function createExplanation(input: {
  description: string;
  signals: string[];
  frame?: AuditFrame;
  fallbackDomain: string;
}): DiffExplanation {
  const governance =
    input.frame?.governance ??
    governanceFallback(input.fallbackDomain);

  return deepFreeze({
    description: input.description,
    signals: input.signals,
    governance,
    evolution: input.frame?.evolution,
    syntheticContext: input.frame?.syntheticContext,
  });
}

function normalizeDeltas(base: Record<string, number>, variant: Record<string, number>): Record<string, number> {
  const keys = Array.from(new Set([...Object.keys(base), ...Object.keys(variant)])).sort();
  const result: Record<string, number> = {};
  keys.forEach((key) => {
    result[key] = (variant[key] ?? 0) - (base[key] ?? 0);
  });
  return result;
}

function selectFrameForDomain(timeline: AuditTimeline, domain: string): AuditFrame | undefined {
  return timeline.frames.find((frame) => frame.governance.domain === domain);
}

export function diffTimelines(baseline: AuditTimeline, comparison: AuditTimeline): TimelineDiff {
  const baselineSummary = summarizeTimeline(baseline);
  const comparisonSummary = summarizeTimeline(comparison);

  const missingInComparison = diffIds(baseline.frames, comparison.frames);
  const missingInBaseline = diffIds(comparison.frames, baseline.frames);
  const metricDivergence = normalizeDeltas(baselineSummary.eventCounts, comparisonSummary.eventCounts);

  const trustSafetyChanges: string[] = [];
  comparisonSummary.trustSafetySignals.forEach((signal) => {
    if (!baselineSummary.trustSafetySignals.has(signal)) {
      trustSafetyChanges.push(`Added trust-safety signal "${signal}"`);
    }
  });
  baselineSummary.trustSafetySignals.forEach((signal) => {
    if (!comparisonSummary.trustSafetySignals.has(signal)) {
      trustSafetyChanges.push(`Missing trust-safety signal "${signal}"`);
    }
  });

  const sloImpacts = {
    latencyP95Delta: computeP95(comparisonSummary.latencies) - computeP95(baselineSummary.latencies),
    bookingDelta: comparisonSummary.bookings - baselineSummary.bookings,
    cancellationDelta: comparisonSummary.cancellations - baselineSummary.cancellations,
  };

  const explanations: DiffExplanation[] = [];

  Object.entries(metricDivergence)
    .filter(([, delta]) => delta !== 0)
    .forEach(([eventType, delta]) => {
      const domain = deriveDomain(eventType);
      const frame = selectFrameForDomain(comparison, domain) ?? selectFrameForDomain(baseline, domain);
      explanations.push(
        createExplanation({
          description: `${eventType} diverged by ${delta} events`,
          signals: [eventType],
          frame,
          fallbackDomain: domain,
        })
      );
    });

  trustSafetyChanges.forEach((change) => {
    const frame = comparison.frames.find((candidate) => candidate.trustSafety?.signals.length);
    const domain = frame?.governance.domain ?? "unknown";
    explanations.push(
      createExplanation({
        description: change,
        signals: frame?.trustSafety?.signals ? [...frame.trustSafety.signals] : [],
        frame,
        fallbackDomain: domain,
      })
    );
  });

  missingInComparison.forEach((id) => {
    const frame = baseline.frames.find((candidate) => candidate.id === id);
    const domain = frame?.governance.domain ?? "unknown";
    explanations.push(
      createExplanation({
        description: `Event ${id} missing in comparison timeline`,
        signals: [frame?.envelope.event.type ?? "unknown"],
        frame,
        fallbackDomain: domain,
      })
    );
  });

  missingInBaseline.forEach((id) => {
    const frame = comparison.frames.find((candidate) => candidate.id === id);
    const domain = frame?.governance.domain ?? "unknown";
    explanations.push(
      createExplanation({
        description: `Event ${id} missing in baseline timeline`,
        signals: [frame?.envelope.event.type ?? "unknown"],
        frame,
        fallbackDomain: domain,
      })
    );
  });

  const sortedExplanations = explanations.sort((a, b) => a.description.localeCompare(b.description));

  return deepFreeze({
    baselineId: baseline.id,
    comparisonId: comparison.id,
    missingInComparison,
    missingInBaseline,
    metricDivergence,
    trustSafetyChanges,
    sloImpacts,
    explanations: sortedExplanations,
  });
}
