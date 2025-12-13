import { DomainRegistry } from "@/governance/DomainRegistry";
import { OpsAIGovernanceTrace } from "./types";

function deriveDomain(eventType: string): string {
  return eventType.split(".")[0] ?? "unknown";
}

export function resolveGovernanceTrace(eventType: string, registry?: DomainRegistry): OpsAIGovernanceTrace {
  const domain = deriveDomain(eventType);
  const entry = registry?.entries.find((candidate) => candidate.domain === domain);

  if (!entry) {
    return {
      domain,
      contractVersion: "unregistered",
      permitted: false,
      reason: `Domain "${domain}" is not registered in governance.`,
    };
  }

  if (entry.deprecation?.willDeprecate) {
    return {
      domain,
      contractVersion: entry.contract.version,
      contract: entry.contract,
      evolution: entry.evolution,
      deprecation: entry.deprecation,
      permitted: false,
      reason: `Domain "${domain}" is marked for deprecation${entry.deprecation.sunsetDate ? ` (sunsets ${entry.deprecation.sunsetDate})` : ""}.`,
    };
  }

  return {
    domain,
    contractVersion: entry.contract.version,
    contract: entry.contract,
    evolution: entry.evolution,
    deprecation: entry.deprecation,
    permitted: true,
  };
}
