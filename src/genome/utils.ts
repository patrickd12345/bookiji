import fs from "node:fs";
import path from "node:path";

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return path.resolve(repoRoot, relativePath);
}

export function exists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

export function isDirectory(targetPath: string): boolean {
  try {
    return fs.statSync(targetPath).isDirectory();
  } catch {
    return false;
  }
}

export function isDirectoryPopulated(targetPath: string): boolean {
  if (!isDirectory(targetPath)) return false;
  try {
    const entries = fs.readdirSync(targetPath);
    return entries.length > 0;
  } catch {
    return false;
  }
}

export function readFile(targetPath: string): string | null {
  try {
    return fs.readFileSync(targetPath, "utf8");
  } catch {
    return null;
  }
}

export function tryParseJson(targetPath: string): { ok: boolean; value?: unknown; error?: string } {
  const raw = readFile(targetPath);
  if (raw === null) {
    return { ok: false, error: "file not readable" };
  }

  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch (error) {
    return { ok: false, error: (error as Error).message };
  }
}

export function isFileEmpty(targetPath: string): boolean {
  const contents = readFile(targetPath);
  return contents !== null && contents.trim().length === 0;
}
