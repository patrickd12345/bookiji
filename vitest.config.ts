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
    maxWorkers: 2, // Limit concurrent workers to reduce memory usage
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
      "tests/components/**/*.test.{ts,tsx}",
      "tests/unit/**/*.test.{ts,tsx}",
      "tests/api/**/*.spec.ts"
    ],
    exclude: [
      "node_modules/**/*"
    ],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
