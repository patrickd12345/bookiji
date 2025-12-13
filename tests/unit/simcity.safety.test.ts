import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import { startSimCityDaemon } from "@/simcity/daemon";

function collectSimCitySources(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const resolved = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...collectSimCitySources(resolved));
    } else if (entry.isFile() && resolved.endsWith(".ts")) {
      files.push(resolved);
    }
  }
  return files;
}

describe("SimCity safety rails", () => {
  it("disallows raw fetch usage outside syntheticFetch", () => {
    const sources = collectSimCitySources(path.join(process.cwd(), "src", "simcity"));
    const disallowed = sources.filter(
      (file) => !file.endsWith("syntheticFetch.ts") && fs.readFileSync(file, "utf8").includes("fetch("),
    );
    expect(disallowed).toEqual([]);
  });

  it("refuses to start the daemon in production", async () => {
    await expect(
      startSimCityDaemon({
        SIMCITY_ALLOWED: "true",
        BOOKIJI_ENV: "prod",
        SIMCITY_TARGET_BASE_URL: "https://localhost:3000",
      }),
    ).rejects.toThrowError(/cannot run in production/);
  });
});
