#!/usr/bin/env node
import path from "node:path";
import { runGenomeLinter } from "./index";

interface CliOptions {
  explain: boolean;
  quiet: boolean;
  repoRoot?: string;
}

function parseArgs(): CliOptions {
  const args = process.argv.slice(2);
  const explain = args.includes("--explain");
  const quiet = args.includes("--quiet") || args.includes("-q");

  const repoRootFlagIndex = args.findIndex((arg) => arg === "--repo-root");
  const repoRoot =
    repoRootFlagIndex >= 0 && args[repoRootFlagIndex + 1]
      ? path.resolve(args[repoRootFlagIndex + 1])
      : undefined;

  if (args.includes("--help") || args.includes("-h")) {
    console.log("Usage: pnpm genome:validate [--quiet] [--repo-root <path>]");
    console.log("       pnpm genome:explain [--repo-root <path>]");
    console.log("--explain       Prints what the linter checks and the error vs warning policy");
    console.log("--quiet | -q    Suppress per-domain findings");
    console.log("--repo-root     Override repository root (defaults to current working directory)");
    process.exit(0);
  }

  return { explain, quiet, repoRoot };
}

async function main(): Promise<void> {
  const options = parseArgs();
  try {
    await runGenomeLinter(options);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Genome linter failed: ${message}`);
    process.exitCode = 1;
  }
}

void main();
