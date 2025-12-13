import path from "node:path";
import { DomainValidationResult, GenomeSpec, RepoContext } from "../loadGenome";
import { checkDirectoryAccess, isDirectory, isDirectoryPopulated, resolveRepoPath, safeExists } from "../utils";

export async function validateNotifications(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const DOMAIN = "NOTIFICATIONS";

  (genome.domains.notifications.channels ?? []).forEach((channel) => {
    const folderPath = resolveRepoPath(context.repoRoot, channel.folder);
    const access = checkDirectoryAccess(folderPath);
    if (!access.exists) {
      errors.push(`${DOMAIN}: Channel "${channel.id}" missing required folder "${channel.folder}" (expected at ${folderPath})`);
    } else if (!access.accessible) {
      errors.push(
        `${DOMAIN}: Channel "${channel.id}" folder at ${folderPath} is not accessible${access.error ? ` (${access.error})` : ""}`
      );
    } else if (!isDirectoryPopulated(folderPath)) {
      warnings.push(`${DOMAIN}: Channel "${channel.id}" folder is empty at ${channel.folder}`);
    }
  });

  (genome.domains.notifications.requiredFiles ?? []).forEach((file) => {
    const filePath = resolveRepoPath(context.repoRoot, file);
    if (!safeExists(filePath)) {
      errors.push(`${DOMAIN}: Notification primitive missing required file "${file}" (expected at ${filePath})`);
    } else if (isDirectory(filePath)) {
      warnings.push(`${DOMAIN}: Path "${file}" is a directory, expected file at ${filePath}`);
    }
  });

  const notifications2 = genome.domains.notifications_2;
  const schemaRoot = notifications2?.schema;

  if (!schemaRoot) {
    errors.push(`${DOMAIN}: notifications_2 schema folder not declared in genome spec`);
  } else {
    const schemaPath = resolveRepoPath(context.repoRoot, schemaRoot);
    const access = checkDirectoryAccess(schemaPath);
    if (!access.exists) {
      errors.push(`${DOMAIN}: notifications_2 schema folder missing at ${schemaRoot} (expected at ${schemaPath})`);
    } else if (!access.accessible) {
      errors.push(`${DOMAIN}: notifications_2 schema folder at ${schemaPath} is not accessible${access.error ? ` (${access.error})` : ""}`);
    }
  }

  (notifications2?.required ?? []).forEach((fileName) => {
    const filePath = schemaRoot ? resolveRepoPath(context.repoRoot, path.join(schemaRoot, fileName)) : "";
    if (!filePath) {
      return;
    }
    if (!safeExists(filePath)) {
      errors.push(`${DOMAIN}: Missing notifications_2 contract "${fileName}" (expected at ${filePath})`);
    }
  });

  return { domain: "notifications", errors, warnings };
}
