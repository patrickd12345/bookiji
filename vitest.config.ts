import { defineConfig } from 'vitest/config';
import path from 'path';
import { readFileSync } from 'fs';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.spec.ts', 'tests/component/**/*.spec.ts'],
    exclude: ['tests/e2e/**', 'tests/a11y/**', 'node_modules/**', 'dist/**'],
    globals: true,          // enable global test functions
    environment: 'jsdom',
    setupFiles: ['src/test/setup.ts'],
    // Use the Vitest-only tsconfig so vitest/globals don't bleed
    pool: 'threads',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: './coverage',
      exclude: ['tests/**', '**/*.d.ts']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  esbuild: { tsconfigRaw: JSON.parse(readFileSync('./tsconfig.vitest.json', 'utf-8')) }
});
