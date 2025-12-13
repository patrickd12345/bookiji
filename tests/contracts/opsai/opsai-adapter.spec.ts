import { describe, expect, it } from "vitest";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { adaptAnalyticsEnvelopeToOpsAI } from "@/opsai/contracts/OpsAIEnvelopeAdapter";

describe("OpsAIEnvelopeAdapter", () => {
  it("normalizes analytics envelopes with diagnostics metadata", () => {
    const envelope: AnalyticsEnvelope = {
      id: "evt-ops-1",
      version: "v1",
      timestamp: 1_700_000_000_500,
      timebase: { logical: 12, simTime: 42 },
      source: "opsai",
      event: {
        type: "anomaly.detected",
        payload: { anomalyId: "an-1", severity: "high", description: "Latency spike" },
      },
      metadata: {
        latencyP95Ms: 123,
        sloViolation: true,
        anomaly: { detector: "opsai", score: 0.92 },
      },
    };

    const adapted = adaptAnalyticsEnvelopeToOpsAI(envelope);

    expect(adapted.version).toBe("opsai/v1");
    expect(adapted.eventType).toBe("anomaly.detected");
    expect(adapted.normalizedType).toBe("ANOMALY_DETECTED");
    expect(adapted.time.logical).toBe(12);
    expect(adapted.time.simTime).toBe(42);
    expect(adapted.diagnostics.latencyP95Ms).toBe(123);
    expect(adapted.diagnostics.sloViolation).toBe(true);
    expect(adapted.diagnostics.anomaly?.anomalyId).toBe("an-1");
    expect(adapted.diagnostics.anomaly?.severity).toBe("high");
  });

  it("extracts p95 hints and SLO flags even without explicit diagnostics blocks", () => {
    const envelope: AnalyticsEnvelope = {
      id: "evt-ops-2",
      version: "v1",
      timestamp: 1_700_000_000_900,
      timebase: { logical: 13 },
      source: "opsai",
      event: {
        type: "ops.incident.created",
        payload: { incidentId: "inc-7", severity: "sev1", summary: "API saturation" },
      },
      metadata: {
        p95Latency: 200,
        sloStatus: "violated",
      },
    };

    const adapted = adaptAnalyticsEnvelopeToOpsAI(envelope);

    expect(adapted.normalizedType).toBe("OPS_INCIDENT_CREATED");
    expect(adapted.diagnostics.latencyP95Ms).toBe(200);
    expect(adapted.diagnostics.sloViolation).toBe(true);
    expect(adapted.diagnostics.anomaly).toBeUndefined();
    expect(adapted.metadata).toMatchObject({ p95Latency: 200, sloStatus: "violated" });
  });
});
