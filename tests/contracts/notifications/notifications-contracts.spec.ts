import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadGenome } from "@/genome/loadGenome";
import { DLQContract } from "@/notifications/contracts/DLQContract";
import { NotificationChannel } from "@/notifications/contracts/NotificationChannel";
import { NotificationEnvelope } from "@/notifications/contracts/NotificationEnvelope";
import { QuietHoursPolicy } from "@/notifications/contracts/QuietHoursPolicy";
import { RetryStrategy } from "@/notifications/contracts/RetryStrategy";

const repoRoot = process.cwd();

describe("Notifications 2.0 genome schema", () => {
  it("pins the schema root and required contracts", () => {
    const genome = loadGenome(path.join(repoRoot, "genome", "master-genome.yaml"));
    expect(genome.domains.notifications_2?.schema).toBe("src/notifications/contracts");
    expect(genome.domains.notifications_2?.required).toEqual([
      "NotificationChannel.ts",
      "NotificationEnvelope.ts",
      "RetryStrategy.ts",
      "QuietHoursPolicy.ts",
      "DLQContract.ts",
    ]);
  });

  it("has each notifications contract file available", () => {
    const genome = loadGenome(path.join(repoRoot, "genome", "master-genome.yaml"));
    const schemaRoot = genome.domains.notifications_2?.schema ?? "";
    (genome.domains.notifications_2?.required ?? []).forEach((fileName) => {
      const filePath = path.resolve(repoRoot, schemaRoot, fileName);
      expect(fs.existsSync(filePath)).toBe(true);
    });
  });
});

describe("Notifications contract shapes", () => {
  it("defines envelopes with typed channel and payload", () => {
    const envelope: NotificationEnvelope = {
      id: "evt-123",
      channel: "webhook" satisfies NotificationChannel,
      recipient: "https://hooks.bookiji.test/notify",
      payload: { bookingId: "bk-1", status: "created" },
      quietHours: true,
    };

    expect(envelope.channel).toBe("webhook");
    expect(envelope.payload.bookingId).toBe("bk-1");
  });

  it("records retry strategy and quiet hours policy", () => {
    const retry: RetryStrategy = { maxAttempts: 5, backoffMs: 250, jitter: true };
    const quiet: QuietHoursPolicy = { start: "22:00", end: "07:00", timezone: "UTC" };
    const dlq: DLQContract = { eventId: "evt-123", reason: "timeout", timestamp: Date.now() };

    expect(retry.maxAttempts).toBeGreaterThanOrEqual(1);
    expect(quiet.start).toBe("22:00");
    expect(dlq.reason).toBe("timeout");
  });
});
