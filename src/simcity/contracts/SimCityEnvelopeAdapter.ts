import { AnalyticsEnvelope } from "@/contracts/analytics/AnalyticsEnvelope";
import { StandardizedEvent } from "@/contracts/analytics/StandardizedEvent";
import { SimCityEventContract } from "./SimCityEventContract";
import { ScenarioContract } from "./ScenarioContract";

export interface SimCityAdapterOptions {
  scenario?: Pick<ScenarioContract, "id" | "label" | "seedData">;
  simulatedTimestamp?: number;
  syntheticEvent?: StandardizedEvent;
  anomalyInjection?: Record<string, unknown>;
}

export function adaptAnalyticsEnvelopeToSimCity(
  envelope: AnalyticsEnvelope,
  options: SimCityAdapterOptions = {}
): SimCityEventContract {
  const event = options.syntheticEvent ?? envelope.event;
  const metadata = (envelope.metadata ?? {}) as Record<string, unknown>;
  const simulatedTimestamp = options.simulatedTimestamp ?? envelope.timebase.simTime;
  const anomalyInjection =
    options.anomalyInjection ??
    (event.type === "anomaly.detected" ? { ...metadata, anomalyId: event.payload.anomalyId } : undefined);

  return {
    id: envelope.id,
    scenario: options.scenario ? { id: options.scenario.id, label: options.scenario.label } : undefined,
    source: envelope.source,
    event,
    logicalTime: {
      logical: envelope.timebase.logical,
      wallClock: envelope.timestamp,
    },
    simulatedTimestamp,
    synthetic: Boolean(options.syntheticEvent),
    anomalyInjection,
    metadata,
  };
}
