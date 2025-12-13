import { describe, expect, it } from "vitest";
import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";

const baseEvent: StandardizedEvent = {
  type: "booking.created",
  payload: { bookingId: "bk-1", providerId: "pr-1" },
};

describe("AnalyticsEnvelope contract", () => {
  it("captures the required envelope shape", () => {
    const envelope: AnalyticsEnvelope = {
      id: "evt-1",
      version: "v1",
      timestamp: Date.now(),
      timebase: { logical: 1, simTime: 1000 },
      source: "core",
      event: baseEvent,
      metadata: { region: "us-east-1" },
    };

    expect(envelope.version).toBe("v1");
    expect(envelope.timebase.logical).toBeGreaterThan(0);
    expect(envelope.event.type).toBe("booking.created");
    expect(envelope.metadata?.region).toBe("us-east-1");
  });

  it("maintains a monotonic logical clock across sequential envelopes", () => {
    const envelopes: AnalyticsEnvelope[] = [
      {
        id: "evt-1",
        version: "v1",
        timestamp: 1_700_000_000_000,
        timebase: { logical: 1 },
        source: "opsai",
        event: baseEvent,
      },
      {
        id: "evt-2",
        version: "v1",
        timestamp: 1_700_000_001_000,
        timebase: { logical: 2 },
        source: "opsai",
        event: { type: "booking.updated", payload: { bookingId: "bk-1", providerId: "pr-1", changes: { status: "confirmed" } } },
      },
      {
        id: "evt-3",
        version: "v1",
        timestamp: 1_700_000_002_000,
        timebase: { logical: 3 },
        source: "opsai",
        event: { type: "message.sent", payload: { messageId: "msg-1", senderId: "user-1", recipientId: "user-2", channel: "inapp" } },
      },
    ];

    const logicalProgression = envelopes.map((item) => item.timebase.logical);
    const sorted = [...logicalProgression].sort((a, b) => a - b);
    expect(logicalProgression).toEqual(sorted);
  });
});
