import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import react from "eslint-plugin-react";

const SHADCN_UI = "src/components/ui/**/*.{ts,tsx}";
const LAYOUT_FILES = [
  "src/app/**/layout.tsx",
  "src/app/**/error.tsx",
  "src/app/**/not-found.tsx",
];
const TEST_FILES = ["__tests__/**/*.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.spec.{ts,tsx}"];

const forbidElementsRule = [
  "error",
  {
    forbid: [
      { element: "button", message: "Use shadcn `<Button>` from @/components/ui/button" },
      { element: "input", message: "Use shadcn `<Input>` from @/components/ui/input" },
      { element: "select", message: "Use shadcn `<Select>` from @/components/ui/select" },
      { element: "textarea", message: "Use shadcn `<Textarea>` from @/components/ui/textarea" },
    ],
  },
];

const eslintConfig = defineConfig([
  {
    ignores: [".next/**", "node_modules/**", "out/**", "coverage/**"],
  },
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    plugins: { react },
    rules: {
      "react/forbid-elements": forbidElementsRule,
      // Dead imports/variables are bugs waiting to happen: promote to error
      // so the compiler catches them early. Underscore-prefixed identifiers
      // are intentionally ignored (e.g. destructured-but-unused fields).
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      // Next 16 + React Compiler: these rules are valid but the existing
      // codebase predates them. Downgrade to warnings so the upgrade lands
      // without blocking lint; track the refactor separately.
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/incompatible-library": "off",
    },
  },
  {
    files: [SHADCN_UI, ...LAYOUT_FILES, ...TEST_FILES],
    rules: {
      "react/forbid-elements": "off",
    },
  },
]);

export default eslintConfig;
