import fs from "node:fs";
import { DomainValidationResult, GenomeSpec, RepoContext } from "./loadGenome";
import { exists, isDirectoryPopulated, resolveRepoPath } from "./utils";

export async function validateNotifications(genome: GenomeSpec, context: RepoContext): Promise<DomainValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  (genome.domains.notifications.channels ?? []).forEach((channel) => {
    const folderPath = resolveRepoPath(context.repoRoot, channel.folder);
    if (!exists(folderPath)) {
      errors.push(`Notification channel '${channel.id}' missing folder ${channel.folder}`);
    } else if (!isDirectoryPopulated(folderPath)) {
      warnings.push(`Notification channel '${channel.id}' folder is empty at ${channel.folder}`);
    }
  });

  (genome.domains.notifications.requiredFiles ?? []).forEach((file) => {
    const filePath = resolveRepoPath(context.repoRoot, file);
    if (!exists(filePath)) {
      errors.push(`Notification primitive missing file ${file}`);
    } else if (fs.statSync(filePath).isDirectory()) {
      warnings.push(`Notification required path ${file} is a directory, expected file`);
    }
  });

  return { domain: "notifications", errors, warnings };
}
