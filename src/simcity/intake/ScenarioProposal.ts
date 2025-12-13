import { PerturbationType } from "../v2/types";
import { ISODateString } from "../compiler/ScenarioPrompt";

export type StressVector = PerturbationType;

export interface ScenarioProposal {
  id: string;
  title: string;
  description: string;
  stressVectors: StressVector[];
  assumptions: string[];
  duration: string;
  forkFrom?: ISODateString;
  confidence: "low" | "medium" | "high";
  notes?: string;
  status?: "ready" | "unexpressible";
}
