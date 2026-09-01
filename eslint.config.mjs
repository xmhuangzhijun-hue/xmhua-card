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
    // Embedded Vite demos are checked in their source repositories before copying.
    "public/demo/**",
    // The API is a separate package with its own typecheck and build.
    "api/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
