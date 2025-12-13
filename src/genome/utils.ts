import fs from "node:fs";
import path from "node:path";

export function resolveRepoPath(repoRoot: string, relativePath: string): string {
  return path.resolve(repoRoot, relativePath);
}

export function exists(targetPath: string): boolean {
  return fs.existsSync(targetPath);
}

export function safeExists(targetPath: string): boolean {
  if (!targetPath) return false;
  try {
    return fs.existsSync(targetPath);
  } catch {
    return false;
  }
}

export function safeReadDir(targetPath: string): string[] {
  if (!safeExists(targetPath)) return [];
  try {
    return fs.readdirSync(targetPath);
  } catch {
    return [];
  }
}

export function checkDirectoryAccess(targetPath: string): { exists: boolean; accessible: boolean; error?: string } {
  if (!targetPath) return { exists: false, accessible: false, error: "no path provided" };
  try {
    fs.accessSync(targetPath, fs.constants.R_OK);
    const stats = fs.statSync(targetPath);
    if (!stats.isDirectory()) {
      return { exists: true, accessible: false, error: "path is not a directory" };
    }
    return { exists: true, accessible: true };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { exists: safeExists(targetPath), accessible: false, error: message };
  }
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
  const entries = safeReadDir(targetPath);
  return entries.length > 0;
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
