export interface ScenarioStep {
  id: string;
  label: string;
  action: string;
  at?: number;
  expects?: string;
  syntheticEventType?: string;
}

export interface ScenarioContract {
  id: string;
  label: string;
  seedData?: Record<string, unknown>;
  steps: ScenarioStep[];
}
