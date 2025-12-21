#!/usr/bin/env node
/**
 * Split Vitest into multiple smaller runs to reduce peak memory usage on Windows.
 *
 * Why:
 * - A single `vitest run` across all suites can exceed the heap and/or pagefile,
 *   causing severe OS slowdown and reboots.
 *
 * Contract:
 * - Exit code is non-zero if any shard fails.
 * - Does NOT change test semantics; only reduces peak memory by running suites sequentially.
 */
import { spawnSync } from "node:child_process";

const MAX_OLD_SPACE_SIZE_MB = process.env.VITEST_HEAP_MB || "4096";

function run(cmd, args, extraEnv = {}) {
  const env = {
    ...process.env,
    NODE_OPTIONS: process.env.NODE_OPTIONS || `--max-old-space-size=${MAX_OLD_SPACE_SIZE_MB}`,
    ...extraEnv,
  };

  const result = spawnSync(cmd, args, {
    stdio: "inherit",
    shell: true,
    env,
  });

  return result.status ?? 1;
}

const shards = [
  {
    name: "api",
    args: ["vitest", "run", "tests/api"],
  },
  {
    name: "unit",
    args: ["vitest", "run", "tests/unit"],
  },
  {
    name: "components:comprehensive",
    args: ["vitest", "run", "tests/components/ComprehensiveComponentTestSuite.test.tsx"],
  },
  {
    name: "components:all",
    args: ["vitest", "run", "tests/components/AllComponentsTestRunner.test.tsx"],
  },
  {
    name: "components:ui",
    args: ["vitest", "run", "tests/components/ui/UIComponentTestSuite.test.tsx"],
  },
  {
    name: "packages",
    args: ["vitest", "run", "packages"],
  },
];

let failed = false;
for (const shard of shards) {
  // eslint-disable-next-line no-console
  console.log(`\n=== Vitest shard: ${shard.name} ===`);
  const code = run("pnpm", shard.args);
  if (code !== 0) {
    failed = true;
    // eslint-disable-next-line no-console
    console.error(`❌ Shard failed: ${shard.name} (exit ${code})`);
    break;
  }
}

process.exit(failed ? 1 : 0);


