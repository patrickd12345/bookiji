import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isFileEmpty, resolveRepoPath } from "./utils";

export async function validateGovernance(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.governance.policies ?? []).forEach((policy) => {
    const policyPath = resolveRepoPath(context.repoRoot, policy);
    if (!exists(policyPath)) {
      errors.push(`Governance policy missing at ${policy}`);
    }
  });

  const changeControl = genome.domains.governance.approvals?.changeControl;
  if (changeControl) {
    const ccPath = resolveRepoPath(context.repoRoot, changeControl);
    if (!exists(ccPath)) {
      errors.push(`Change control file missing at ${changeControl}`);
    } else if (isFileEmpty(ccPath)) {
      warnings.push(`Change control file ${changeControl} is empty`);
    }
  } else {
    errors.push("Change control approval file not defined in genome spec");
  }

  return { domain: "governance", errors, warnings };
}
