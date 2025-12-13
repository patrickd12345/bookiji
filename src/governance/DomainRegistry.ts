import { DeprecationPolicy } from "./DeprecationPolicy";
import { EvolutionFlags } from "./EvolutionFlags";
import { GovernanceContract } from "./GovernanceContract";
import { MigrationRule } from "./MigrationRules";

export interface DomainRegistryEntry {
  domain: string;
  contract: GovernanceContract;
  evolution?: EvolutionFlags;
  deprecation?: DeprecationPolicy;
  migrations?: MigrationRule[];
}

export interface DomainRegistry {
  entries: DomainRegistryEntry[];
}
