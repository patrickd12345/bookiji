export interface GovernanceContract {
  domain: string;
  version: string;
  stability: "stable" | "experimental" | "deprecated";
  allowedMutations: string[];
  forbiddenMutations: string[];
}
