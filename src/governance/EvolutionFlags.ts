export interface EvolutionFlags {
  allowBreakingChanges: boolean;
  requireMigrationPlan: boolean;
  versionUpgradeRequired?: string;
}
