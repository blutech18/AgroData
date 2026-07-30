import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";

export default tseslint.config(
  {
    // Build output, dependencies, and Deno-based Edge Functions (which use
    // remote imports and the Deno global) are linted separately by the
    // Supabase toolchain, not by the app's browser config.
    ignores: ["dist", "node_modules", "supabase/functions"],
  },
  {
    files: ["**/*.{ts,tsx}"],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: {
      ecmaVersion: 2022,
      globals: globals.browser,
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      // Unused variables are already enforced by tsc (noUnusedLocals); keep the
      // ESLint version as a warning that allows the _prefix escape hatch.
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // Config files run in Node.
    files: ["*.config.{js,ts}", "postcss.config.js", "tailwind.config.*"],
    languageOptions: { globals: globals.node },
  }
);
