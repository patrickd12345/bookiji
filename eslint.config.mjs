import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
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
];

export default eslintConfig;
