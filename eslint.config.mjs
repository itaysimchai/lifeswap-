import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      // The app intentionally uses effects to subscribe/reset external state
      // (Firestore snapshots, forms, dialogs). Keep this advisory rule out of
      // the release gate while preserving the rest of React Hooks linting.
      "react-hooks/set-state-in-effect": "off",
    },
  },
]);

export default eslintConfig;
