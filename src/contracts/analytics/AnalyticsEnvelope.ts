import { StandardizedEvent } from "./StandardizedEvent";

export interface AnalyticsEnvelope {
  id: string; // UUID
  version: "v1"; // schema version
  timestamp: number; // epoch ms
  timebase: {
    logical: number; // Lamport clock
    simTime?: number; // only for SimCity
  };
  source: "core" | "opsai" | "simcity" | "n8n";
  event: StandardizedEvent;
  metadata?: Record<string, any>;
}
