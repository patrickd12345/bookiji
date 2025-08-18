import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  {
    ignores: [
      "**/.next/**",
      "node_modules/**",
      "playwright-report/**",
      "coverage/**",
      "dist/**",
      "out/**",
      "public/sw.js",
      "scripts/**",
      "**/*.min.js",
      "**/generated/**",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TEMPORARY: Downgrade noisy rules to warnings during the integrity sprint.
      // Turn off unused-vars to silence safe but noisy warnings. We can re-enable after full cleanup.
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "prefer-rest-params": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Unit tests can use vitest
  {
    files: ['src/**/__tests__/**/*.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: {}
  },
  // Everywhere else: ban vitest
  {
    files: ['tests/**/*.{ts,tsx}', 'src/**/*.{ts,tsx}'],
    ignores: ['src/**/__tests__/**/*.{ts,tsx}', 'src/**/*.spec.{ts,tsx}', 'src/**/*.test.{ts,tsx}'],
    rules: {
      'no-restricted-imports': ['error', { paths: ['vitest'] }]
    }
  },
  // Allow vitest in test files
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.spec.{ts,tsx}', '**/*.test.{ts,tsx}', '**/test/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': 'off'
    }
  },
  // Tests can use @playwright/test
  {
    files: ['tests/**/*.{ts,tsx}'],
    rules: {}
  },
  // Playwright config files can use @playwright/test
  {
    files: ['playwright*.config.ts'],
    rules: {
      'no-restricted-imports': 'off'
    }
  },
  // Everywhere else: ban @playwright/test
  {
    files: ['**/*.{ts,tsx}'],
    ignores: ['tests/**/*.{ts,tsx}', 'playwright*.config.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: ['@playwright/test'] }]
    }
  }
];

export default eslintConfig;
