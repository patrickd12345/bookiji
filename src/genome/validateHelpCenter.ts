import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { resolveRepoPath, safeExists } from "./utils";

export async function validateHelpCenter(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "HELP CENTER";

  const knowledgeBase = genome.domains.helpCenter.knowledgeBase;
  if (knowledgeBase?.root) {
    const kbRoot = resolveRepoPath(context.repoRoot, knowledgeBase.root);
    if (!safeExists(kbRoot)) {
      errors.push(`${DOMAIN}: Missing required knowledge base root (expected at ${kbRoot})`);
    } else {
      (knowledgeBase.requiredFiles ?? []).forEach((file) => {
        const filePath = path.join(kbRoot, file);
        if (!safeExists(filePath)) {
          errors.push(`${DOMAIN}: Knowledge base missing required file "${file}" (expected at ${filePath})`);
        }
      });
    }
  } else {
    warnings.push(`${DOMAIN}: Knowledge base root not defined in genome spec`);
  }

  const userGuides = genome.domains.helpCenter.userGuides?.folder;
  if (userGuides) {
    const guidePath = resolveRepoPath(context.repoRoot, userGuides);
    if (!safeExists(guidePath)) {
      warnings.push(`${DOMAIN}: User guide folder missing at ${userGuides} (expected at ${guidePath})`);
    }
  } else {
    warnings.push(`${DOMAIN}: User guide folder not declared in genome spec`);
  }

  return { domain: "help center", errors, warnings };
}
