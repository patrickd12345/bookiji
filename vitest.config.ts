import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    testTimeout: 10000, // 10 second timeout for tests
    maxWorkers: 1, // Limit concurrent workers to reduce memory usage
    // Use VM-isolated forks so workers can be recycled by memory limit.
    // This prevents long-run heap growth and OOM on large jsdom-heavy suites.
    pool: "vmForks",
    poolOptions: {
      vmForks: {
        // Recycle the worker when it exceeds this threshold.
        // Accepts values like "512MB", "1GB", or percentages like "50%".
        memoryLimit: "1024MB",
      },
    },
    coverage: {
      reporter: ["text", "html"],
      exclude: [
        "node_modules/",
        "tests/setup.ts",
      ],
    },
    include: [
      "src/**/*.{test,spec}.{ts,tsx}",
      "tests/components/**/*.test.{ts,tsx}",
      "tests/unit/**/*.{test,spec}.{ts,tsx}",
      "tests/lib/**/*.{spec,test}.{ts,tsx}",
      "tests/api/**/*.spec.ts",
      "tests/contracts/**/*.{spec,test}.{ts,tsx}",
      "tests/governance/**/*.{spec,test}.{ts,tsx}",
      "packages/**/tests/**/*.{test,spec}.{ts,tsx}"
    ],
    exclude: [
      "node_modules/**/*",
      // Playwright "contract" tests live under tests/api/contracts and should NOT be executed by Vitest.
      "tests/api/contracts/**/*",
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
