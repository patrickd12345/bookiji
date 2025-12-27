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
    pool: "forks", // Use fork pool for better memory management
    poolOptions: {
      forks: {
        singleFork: true, // Use single fork for memory-intensive tests
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
      "tests/unit/**/*.test.{ts,tsx}",
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
