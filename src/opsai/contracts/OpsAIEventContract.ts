import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { StandardizedEvent, StandardizedEventType } from "@/contracts/analytics/StandardizedEvent";

export interface OpsAIEventContract {
  id: string;
  version: "opsai/v1";
  source: AnalyticsEnvelope["source"];
  eventType: StandardizedEventType;
  normalizedType: string;
  payload: StandardizedEvent["payload"];
  time: {
    observed: number;
    logical: number;
    wallClock: number;
    simTime?: number;
  };
  diagnostics: {
    anomaly?: Record<string, unknown>;
    latencyP95Ms?: number;
    sloViolation?: boolean;
  };
  metadata: Record<string, unknown>;
}
