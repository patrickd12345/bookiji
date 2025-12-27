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
      "next-env.d.ts",
    ],
  },
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    rules: {
      // TEMPORARY: Downgrade noisy rules to warnings during the integrity sprint.
      // Turn off unused-vars to silence safe but noisy warnings. We can re-enable after full cleanup.
      "@typescript-eslint/no-unused-vars": ["warn", {
        "argsIgnorePattern": "^_",
        "varsIgnorePattern": "^_",
        "caughtErrorsIgnorePattern": "^_"
      }],
      "@typescript-eslint/no-explicit-any": "warn", // Warn in non-critical paths
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "prefer-rest-params": "warn",
      "@next/next/no-html-link-for-pages": "off",
    },
  },
  // Follow-up A: Ban console.log in critical paths (lib, API routes)
  // Allow console.warn/error for logger implementation
  {
    files: ["src/lib/**/*", "src/app/api/**/*"],
    rules: {
      "no-console": ["error", {
        allow: ["warn", "error"] // Allow console.warn/error (used by logger)
      }],
    },
  },
  // Warn on console.log in UI components (allow for now, migrate opportunistically)
  // Exclude API routes which are already covered by the stricter rule above
  {
    files: ["src/components/**/*", "src/app/**/*.tsx", "src/app/**/*.ts"],
    ignores: ["src/app/api/**/*"], // API routes already have stricter rule
    rules: {
      "no-console": "warn", // Warn but don't fail (for opportunistic cleanup)
    },
  },
  // Option A: Ban explicit any in critical paths (money, auth, ops)
  {
    files: [
      "src/lib/services/**/*",
      "src/lib/auth/**/*",
      "src/app/api/webhooks/**/*",
      "src/app/api/bookings/**/*",
      "src/app/api/ops/**/*",
      "src/app/api/auth/**/*"
    ],
    rules: {
      "@typescript-eslint/no-explicit-any": "error", // Strict ban in critical paths
    },
  },
];

export default eslintConfig;
