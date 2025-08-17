import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'tests/**/*', 
      'playwright-report', 
      'test-results', 
      'node_modules',
      '**/*.playwright.{test,spec}.{ts,tsx}'
    ],
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    coverage: {
      reporter: ["text", "html"],
      exclude: [
        "node_modules/",
        "src/test/setup.ts",
        "tests/**/*",
        "playwright-report/**/*",
        "test-results/**/*"
      ],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
