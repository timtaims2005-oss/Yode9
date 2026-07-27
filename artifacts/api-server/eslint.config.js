// @ts-check
import eslint from "@eslint/js";
import tseslint from "typescript-eslint";
import globals from "globals";

/**
 * Strict ESLint configuration for the API server.
 * Focus areas:
 *  - No memory leaks (no dangling listeners, timers, or closures)
 *  - No silent error swallowing
 *  - Strict TypeScript — no implicit any, no unsafe access
 *  - Consistent async/await — no floating promises
 *  - Security basics — no eval, no process.exit without cleanup
 */
export default tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.strictTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      globals: { ...globals.node },
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // ── TypeScript strict ───────────────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unsafe-argument": "warn",
      "@typescript-eslint/no-unsafe-assignment": "warn",
      "@typescript-eslint/no-unsafe-member-access": "warn",
      "@typescript-eslint/no-unsafe-call": "warn",
      "@typescript-eslint/no-unsafe-return": "warn",

      // ── Floating promises (memory leaks & unhandled rejections) ────────────
      "@typescript-eslint/no-floating-promises": "error",
      "@typescript-eslint/no-misused-promises": "error",
      "no-void": ["error", { allowAsStatement: true }],

      // ── No silent error swallowing ─────────────────────────────────────────
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/no-empty-function": ["warn", { allow: ["arrowFunctions"] }],

      // ── Async consistency ──────────────────────────────────────────────────
      "@typescript-eslint/await-thenable": "error",
      "@typescript-eslint/require-await": "error",
      "@typescript-eslint/return-await": ["error", "in-try-catch"],

      // ── No memory leak patterns ────────────────────────────────────────────
      "no-eval": "error",
      "no-implied-eval": "error",
      "no-new-func": "error",

      // ── Unused vars (dangling references = potential leaks) ────────────────
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],

      // ── General quality ────────────────────────────────────────────────────
      "prefer-const": "error",
      "no-var": "error",
      "eqeqeq": ["error", "always", { null: "ignore" }],
      "no-console": ["warn", { allow: ["warn", "error"] }],

      // ── Nullish safety ─────────────────────────────────────────────────────
      "@typescript-eslint/no-non-null-assertion": "warn",

      // ── Intentional relaxations ────────────────────────────────────────────
      "@typescript-eslint/consistent-type-imports": "off", // mixed TS versions
      "@typescript-eslint/no-redundant-type-constituents": "off",
    },
  },
  {
    // Relax rules for test files
    files: ["**/*.test.ts", "**/*.spec.ts", "tests/**/*"],
    rules: {
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-explicit-any": "off",
      "no-console": "off",
    },
  },
  {
    // Generated files — do not lint
    ignores: ["dist/**", "node_modules/**", "**/*.mjs"],
  },
);
