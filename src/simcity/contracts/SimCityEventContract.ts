import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";
import { LogicalTime } from "@/contracts/analytics/Timebase";
import { ScenarioContract } from "./ScenarioContract";

export interface SimCityEventContract {
  id: string;
  scenario?: Pick<ScenarioContract, "id" | "label">;
  source: AnalyticsEnvelope["source"];
  event: StandardizedEvent;
  logicalTime: LogicalTime;
  simulatedTimestamp?: number;
  synthetic?: boolean;
  anomalyInjection?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}
