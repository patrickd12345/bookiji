export type ISODateString = string;

export interface ScenarioPrompt {
  description: string;
  intent?: "stress" | "explore" | "postmortem";
  constraints?: string[];
  forkFrom?: ISODateString;
  duration?: string; // ISO 8601 duration or human text, validation is deterministic only
}
