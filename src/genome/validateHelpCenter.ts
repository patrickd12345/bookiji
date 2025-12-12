import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, resolveRepoPath } from "./utils";

export async function validateHelpCenter(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  const knowledgeBase = genome.domains.helpCenter.knowledgeBase;
  if (knowledgeBase?.root) {
    const kbRoot = resolveRepoPath(context.repoRoot, knowledgeBase.root);
    if (!exists(kbRoot)) {
      errors.push(`Knowledge base root missing at ${knowledgeBase.root}`);
    } else {
      (knowledgeBase.requiredFiles ?? []).forEach((file) => {
        const filePath = path.join(kbRoot, file);
        if (!exists(filePath)) {
          errors.push(`Knowledge base missing required file ${file}`);
        }
      });
    }
  } else {
    warnings.push("Knowledge base root not defined in genome spec");
  }

  const userGuides = genome.domains.helpCenter.userGuides?.folder;
  if (userGuides) {
    const guidePath = resolveRepoPath(context.repoRoot, userGuides);
    if (!exists(guidePath)) {
      warnings.push(`User guide folder missing at ${userGuides}`);
    }
  } else {
    warnings.push("User guide folder not declared in genome spec");
  }

  return { domain: "help center", errors, warnings };
}
