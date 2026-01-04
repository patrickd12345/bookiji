export type StandardizedEvent =
  | {
      type: "booking.created";
      payload: { bookingId: string; providerId: string };
    }
  | {
      type: "booking.updated";
      payload: { bookingId: string; providerId: string; changes: Record<string, unknown> };
    }
  | {
      type: "booking.cancelled";
      payload: { bookingId: string; providerId: string; reason?: string };
    }
  | {
      type: "provider.updated";
      payload: { providerId: string; fields: string[]; updatedAt?: number };
    }
  | {
      type: "message.sent";
      payload: {
        messageId: string;
        threadId?: string;
        senderId: string;
        recipientId: string;
        channel: "sms" | "email" | "inapp";
      };
    }
  | {
      type: "anomaly.detected";
      payload: { anomalyId: string; severity: "low" | "medium" | "high" | "critical"; description?: string };
    }
  | {
      type: "ops.incident.created";
      payload: { incidentId: string; severity: "sev0" | "sev1" | "sev2" | "sev3"; summary: string; impact?: string };
    }
  | {
      type: "simcity.scenario.started";
      payload: { scenarioId: string; runId: string; seed?: string };
    }
  | {
      type: "simcity.scenario.completed";
      payload: { scenarioId: string; runId: string; outcome: "success" | "failure" | "mixed"; durationMs?: number };
    };

export type StandardizedEventType = StandardizedEvent["type"];
