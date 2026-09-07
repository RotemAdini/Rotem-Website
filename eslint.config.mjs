import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Deliberate, site-wide choice for this migration: recipe/date/game
      // images come from a JSON catalog with no known intrinsic dimensions,
      // and pixel-identical parity with the original static site mattered
      // more than the automatic optimization next/image provides. See the
      // migration summary for the recommended follow-up.
      "@next/next/no-img-element": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Pre-migration static site — kept on disk until the Next.js migration
    // is verified (see README), but it's not part of this app and was never
    // written against these lint rules.
    "games/**",
    "recipes/**",
    "images/**",
    "reports/**",
    "scripts/**",
    "tools/**",
    "*.html",
    "script.js",
    // Legacy game scripts are intentionally served as static assets rather
    // than treated as TypeScript application source.
    "public/games/**",
  ]),
]);

export default eslintConfig;
