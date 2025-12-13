import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";
import { OpsAIEventContract } from "./OpsAIEventContract";

function normalizeEventType(event: StandardizedEvent): string {
  return event.type.replace(/\./g, "_").toUpperCase();
}

function extractLatencyP95(metadata: Record<string, unknown>): number | undefined {
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

function extractAnomalyMetadata(event: StandardizedEvent, metadata: Record<string, unknown>): Record<string, unknown> | undefined {
  if (event.type === "anomaly.detected") {
    return {
      ...metadata,
      anomalyId: event.payload.anomalyId,
      severity: event.payload.severity,
    };
  }

  const candidate = metadata.anomaly;
  if (candidate && typeof candidate === "object") {
    return candidate as Record<string, unknown>;
  }

  return undefined;
}

export function adaptAnalyticsEnvelopeToOpsAI(envelope: AnalyticsEnvelope): OpsAIEventContract {
  const metadata = (envelope.metadata ?? {}) as Record<string, unknown>;
  const normalizedType = normalizeEventType(envelope.event);
  const latencyP95Ms = extractLatencyP95(metadata);
  const anomaly = extractAnomalyMetadata(envelope.event, metadata);
  const sloViolation = extractSloViolation(metadata);

  return {
    id: envelope.id,
    version: "opsai/v1",
    source: envelope.source,
    eventType: envelope.event.type,
    normalizedType,
    payload: envelope.event.payload,
    time: {
      observed: envelope.timestamp,
      logical: envelope.timebase.logical,
      wallClock: envelope.timestamp,
      simTime: envelope.timebase.simTime,
    },
    diagnostics: {
      anomaly,
      latencyP95Ms,
      sloViolation,
    },
    metadata,
  };
}
